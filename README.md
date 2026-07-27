cat > README.md << 'ENDOFREADME'
# Feelinks Fees Backend

Fee management backend for a school, supporting M-Pesa payments via **C2B
(Paybill and Till)** and **STK Push**, with automatic reconciliation and
receipt generation.

## Tech stack

- **Runtime:** Node.js, NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon), accessed via TypeORM
- **Queue/cache:** Redis (BullMQ), for background jobs
- **PDF generation:** pdfkit
- **SMS:** Mobiwave
- **Deployment:** Docker → Render

## Architecture

Two intake channels converge on one ledger:

- **C2B (Paybill/Till):** Safaricom posts an unsolicited confirmation to
  `/mpesa/c2b/confirmation`. The payment isn't tied to an invoice yet, so a
  reconciliation worker matches it — by account reference for Paybill, by
  phone + amount for Till (which carries no account reference at all).
- **STK Push:** the backend initiates the payment via `/mpesa/stk/initiate`,
  already knowing which invoice it's for. The callback at
  `/mpesa/stk/callback` resolves directly to that invoice — no matching step
  needed.

Both channels write into a single `mpesa_transactions` table and, once
resolved, go through the same locked ledger update
(`SELECT ... FOR UPDATE` on the invoice row), receipt generation, and SMS
notification path.

See `schema.sql` for the full table design, constraints, and triggers —
it is the source of truth for the data model. TypeORM entities in
`src/database/entities` mirror it and run with `synchronize: false`.

### Core tables

| Table                | Purpose                                              |
|----------------------|-------------------------------------------------------|
| `students`            | Student + parent contact records                     |
| `terms`               | Academic terms, one active at a time                  |
| `invoices`            | Per-student, per-term fee balance                      |
| `business_accounts`   | Registered Paybill/Till shortcodes                     |
| `stk_requests`        | STK push initiations, keyed by `checkout_request_id`   |
| `mpesa_transactions`  | Raw ledger for both C2B and STK payments                |
| `receipt_counters`    | Lockable sequence for receipt numbering                |
| `receipts`            | One per reconciled transaction                          |
| `payment_events`      | Append-only audit trail                                 |
| `notifications`       | SMS/email delivery tracking                              |

## Project layout