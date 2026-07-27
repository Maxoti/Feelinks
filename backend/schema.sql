-- ============================================================================
-- Fee Management System — Schema
-- Single-tenant. Supports M-Pesa C2B (Paybill/Till) and STK Push.
-- Idempotent: safe to re-run against an existing database.
-- Target: PostgreSQL 14+ (Neon)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Shared trigger function: keep updated_at current on every UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. students
-- ============================================================================
CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no    TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  grade           TEXT,
  parent_name     TEXT,
  parent_phone    TEXT NOT NULL,           -- normalized to 2547XXXXXXXX at app layer
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students (parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. terms
-- ============================================================================
CREATE TABLE IF NOT EXISTS terms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER NOT NULL,
  term_number     INTEGER NOT NULL CHECK (term_number IN (1, 2, 3)),
  name            TEXT NOT NULL,            -- e.g. 'Term 1 2026'
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, term_number)
);

-- Only one active term at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_terms_single_active
  ON terms (is_active) WHERE is_active = true;

-- ============================================================================
-- 3. invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  term_id         UUID NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
  amount_due      NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance         NUMERIC(12,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status          TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid', 'partial', 'paid', 'overpaid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_term ON invoices (term_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-derive status from amount_due/amount_paid on every insert/update
CREATE OR REPLACE FUNCTION invoices_set_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount_paid <= 0 THEN
    NEW.status := 'unpaid';
  ELSIF NEW.amount_paid < NEW.amount_due THEN
    NEW.status := 'partial';
  ELSIF NEW.amount_paid = NEW.amount_due THEN
    NEW.status := 'paid';
  ELSE
    NEW.status := 'overpaid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_set_status ON invoices;
CREATE TRIGGER trg_invoices_set_status
  BEFORE INSERT OR UPDATE OF amount_paid, amount_due ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_set_status();

-- ============================================================================
-- 4. business_accounts — your registered Paybill/Till shortcodes
--    Single-tenant today, but this is also exactly the table that becomes
--    per-school in the multi-tenant version later.
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label           TEXT NOT NULL,             -- e.g. 'Main School Paybill'
  shortcode       TEXT NOT NULL UNIQUE,      -- the Daraja BusinessShortCode
  account_type    TEXT NOT NULL CHECK (account_type IN ('paybill', 'till')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_accounts_active
  ON business_accounts (is_active) WHERE is_active = true;

-- ============================================================================
-- 5. stk_requests — created at STK initiate time, before Safaricom responds
-- ============================================================================
CREATE TABLE IF NOT EXISTS stk_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  business_account_id   UUID NOT NULL REFERENCES business_accounts(id) ON DELETE RESTRICT,
  checkout_request_id   TEXT NOT NULL UNIQUE,
  merchant_request_id   TEXT,
  phone                 TEXT NOT NULL,
  amount                NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
  result_code           INTEGER,
  result_desc           TEXT,
  mpesa_receipt_number  TEXT,
  initiated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stk_requests_invoice ON stk_requests (invoice_id);
CREATE INDEX IF NOT EXISTS idx_stk_requests_status ON stk_requests (status);
CREATE INDEX IF NOT EXISTS idx_stk_requests_business_account ON stk_requests (business_account_id);

-- Guard against a second concurrent STK push for the same unresolved invoice.
-- App layer should still check before initiating, but this is the DB backstop.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stk_requests_one_pending_per_invoice
  ON stk_requests (invoice_id) WHERE status = 'pending';

-- ============================================================================
-- 6. mpesa_transactions — raw ledger for BOTH channels (c2b + stk),
--    across BOTH account types (paybill + till)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel             TEXT NOT NULL CHECK (channel IN ('c2b', 'stk')),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE RESTRICT,
  account_type        TEXT NOT NULL CHECK (account_type IN ('paybill', 'till')),
  trans_id            TEXT NOT NULL UNIQUE,     -- Safaricom TransID / MpesaReceiptNumber
  msisdn              TEXT NOT NULL,
  trans_amount        NUMERIC(12,2) NOT NULL CHECK (trans_amount > 0),
  bill_ref_number     TEXT,                     -- Paybill: account ref as typed by parent.
                                                  -- Till: normally NULL (no account field exists).
  trans_time          TIMESTAMPTZ NOT NULL,
  stk_request_id      UUID REFERENCES stk_requests(id) ON DELETE SET NULL,
  matched_invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'unmatched'
                      CHECK (status IN ('unmatched', 'matched', 'reconciled', 'rejected')),
  match_confidence    NUMERIC(4,3),             -- 0.000–1.000, for C2B fuzzy matching
  raw_payload         JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_at       TIMESTAMPTZ,
  -- Till payments should never carry an account reference — if bill_ref_number
  -- shows up on a 'till' row it means something upstream is misconfigured
  -- (exactly the class of bug you hit on Pesawazi). Flag it loudly instead of
  -- silently accepting it.
  CONSTRAINT chk_till_has_no_bill_ref
    CHECK (NOT (account_type = 'till' AND bill_ref_number IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_mpesa_tx_status ON mpesa_transactions (status);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_bill_ref ON mpesa_transactions (bill_ref_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_msisdn ON mpesa_transactions (msisdn);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_invoice ON mpesa_transactions (matched_invoice_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_channel ON mpesa_transactions (channel);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_business_account ON mpesa_transactions (business_account_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_account_type ON mpesa_transactions (account_type);
-- Speeds up "unmatched C2B queue" dashboard views
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_unmatched
  ON mpesa_transactions (created_at) WHERE status = 'unmatched';

-- ============================================================================
-- 7. receipt_counters — lockable sequence, one row (per school later)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_counters (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  current_number  BIGINT NOT NULL DEFAULT 0
);

INSERT INTO receipt_counters (id, current_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Atomic "get next receipt number" — locks the row for the duration of the tx
CREATE OR REPLACE FUNCTION next_receipt_number()
RETURNS BIGINT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  UPDATE receipt_counters
  SET current_number = current_number + 1
  WHERE id = 1
  RETURNING current_number INTO next_val;
  RETURN next_val;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. receipts
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no      BIGINT NOT NULL UNIQUE,
  transaction_id  UUID NOT NULL REFERENCES mpesa_transactions(id) ON DELETE RESTRICT,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  pdf_url         TEXT,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id)  -- one receipt per transaction, hard idempotency guard
);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON receipts (invoice_id);

-- ============================================================================
-- 9. payment_events — append-only audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES mpesa_transactions(id) ON DELETE SET NULL,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,   -- e.g. 'received', 'auto_matched', 'manually_assigned',
                                    -- 'reconciled', 'receipt_issued', 'sms_sent', 'sms_failed'
  actor           TEXT,            -- 'system' | admin user id/email
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_transaction ON payment_events (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_invoice ON payment_events (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events (event_type);

-- Auto-log an event whenever a transaction becomes reconciled — DB-level
-- safety net so the audit trail exists even if the app layer forgets to log it.
CREATE OR REPLACE FUNCTION log_transaction_reconciled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'reconciled' AND (OLD.status IS DISTINCT FROM 'reconciled') THEN
    INSERT INTO payment_events (transaction_id, invoice_id, event_type, actor, payload)
    VALUES (
      NEW.id,
      NEW.matched_invoice_id,
      'reconciled',
      'system',
      jsonb_build_object('trans_id', NEW.trans_id, 'amount', NEW.trans_amount, 'channel', NEW.channel)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mpesa_tx_log_reconciled ON mpesa_transactions;
CREATE TRIGGER trg_mpesa_tx_log_reconciled
  AFTER UPDATE OF status ON mpesa_transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_reconciled();

-- ============================================================================
-- 10. notifications — SMS/email delivery tracking (so failures are visible)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_id  UUID REFERENCES mpesa_transactions(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient       TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  provider_ref    TEXT,             -- Mobiwave message id, once sent
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_invoice ON notifications (invoice_id);

-- ============================================================================
-- Seed: register your Daraja shortcodes here. Edit values before running,
-- or delete this block and insert via the app/admin UI instead.
-- ============================================================================
-- INSERT INTO business_accounts (label, shortcode, account_type) VALUES
--   ('School Paybill', '<your_paybill_shortcode>', 'paybill'),
--   ('School Till', '<your_till_shortcode>', 'till')
-- ON CONFLICT (shortcode) DO NOTHING;

-- ============================================================================
-- Done.
-- ============================================================================