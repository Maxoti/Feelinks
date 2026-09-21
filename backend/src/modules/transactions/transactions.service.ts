import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReconciliationService } from '../mpesa/reconciliation/reconciliation.service'; // adjust path if yours differs

const STATUSES = ['unmatched', 'matched', 'reconciled', 'rejected'];

const TX_COLUMNS = `
  t.id, t.trans_id AS "transId", t.channel, t.account_type AS "accountType", t.msisdn,
  t.trans_amount AS "transAmount", t.bill_ref_number AS "billRefNumber",
  t.trans_time AS "transTime", t.status, t.match_confidence AS "matchConfidence"`;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly db: DataSource,
    private readonly reconciliation: ReconciliationService,
  ) {}

  list(status: string) {
    if (!STATUSES.includes(status)) throw new BadRequestException('Unknown status');
    return this.db.query(
      `SELECT ${TX_COLUMNS} FROM mpesa_transactions t
       WHERE t.status = $1 ORDER BY t.trans_time DESC LIMIT 200`,
      [status],
    );
  }

  // Suggests open invoices whose student matches the typed reference or the paying phone.
  // No invented confidence score: it states WHY each invoice is suggested.
  async candidates(id: string) {
    const [tx] = await this.db.query(`SELECT id FROM mpesa_transactions WHERE id = $1`, [id]);
    if (!tx) throw new NotFoundException('Transaction not found');

    return this.db.query(
      `
      WITH x AS (
        SELECT i.id AS invoice_id, s.full_name, s.admission_no, s.grade, tm.name AS term_name,
               tm.year, tm.term_number, i.balance, i.status,
               (t.bill_ref_number IS NOT NULL
                 AND upper(regexp_replace(t.bill_ref_number, '[^A-Za-z0-9]', '', 'g'))
                   = upper(regexp_replace(s.admission_no,    '[^A-Za-z0-9]', '', 'g'))) AS by_ref,
               (s.parent_phone = t.msisdn) AS by_phone
        FROM mpesa_transactions t
        CROSS JOIN students s
        JOIN invoices i ON i.student_id = s.id AND i.status IN ('unpaid','partial')
        JOIN terms tm   ON tm.id = i.term_id
        WHERE t.id = $1
      )
      SELECT invoice_id AS "invoiceId", full_name AS "studentName", admission_no AS "admissionNo",
             grade, term_name AS "termName", balance, status,
             array_remove(ARRAY[
               CASE WHEN by_ref   THEN 'admission_no' END,
               CASE WHEN by_phone THEN 'phone' END
             ], NULL) AS reasons
      FROM x
      WHERE by_ref OR by_phone
      ORDER BY by_ref DESC, year DESC, term_number DESC
      `,
      [id],
    );
  }

  async assign(id: string, invoiceId: string) {
    const [tx] = await this.db.query(`SELECT status FROM mpesa_transactions WHERE id = $1`, [id]);
    if (!tx) throw new NotFoundException('Transaction not found');
    // manuallyAssign() itself only refuses 'reconciled' rows, so the queue rule lives here.
    if (tx.status !== 'unmatched') throw new ConflictException('This payment has already been handled');

    const [inv] = await this.db.query(`SELECT status FROM invoices WHERE id = $1`, [invoiceId]);
    if (!inv) throw new NotFoundException('Invoice not found');
    if (!['unpaid', 'partial'].includes(inv.status)) {
      throw new ConflictException('That invoice is already fully paid');
    }

    await this.reconciliation.manuallyAssign(id, invoiceId, 'admin'); // 'admin' until logins exist

    // manuallyAssign() returns quietly if a concurrent request reconciled the row first,
    // so confirm this call's assignment is what actually landed.
    const [after] = await this.db.query(
      `SELECT status, matched_invoice_id AS "matchedInvoiceId" FROM mpesa_transactions WHERE id = $1`,
      [id],
    );
    if (after.status !== 'reconciled' || after.matchedInvoiceId !== invoiceId) {
      throw new ConflictException('This payment was assigned by someone else. Refresh the list.');
    }

    const [updated] = await this.db.query(`SELECT ${TX_COLUMNS} FROM mpesa_transactions t WHERE t.id = $1`, [id]);
    return updated;
  }
}
