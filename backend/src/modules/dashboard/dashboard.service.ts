import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const TZ = 'Africa/Nairobi'; // server runs in UTC, so "today" must be Nairobi's today

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview() {
    // Money in = every non-rejected M-Pesa transaction, matched or not.
    // STK and C2B both land in mpesa_transactions, so nothing is double counted via stk_requests.
    const [tx] = await this.dataSource.query(
      `
      WITH b AS (
        SELECT date_trunc('day',   now() AT TIME ZONE $1) AS day_start,
               date_trunc('month', now() AT TIME ZONE $1) AS month_start
      )
      SELECT
        COALESCE(SUM(t.trans_amount) FILTER (WHERE t.status <> 'rejected'
                 AND (t.trans_time AT TIME ZONE $1) >= b.day_start), 0)    AS collected_today,
        COALESCE(SUM(t.trans_amount) FILTER (WHERE t.status <> 'rejected'
                 AND (t.trans_time AT TIME ZONE $1) >= b.month_start), 0)  AS collected_month,
        COUNT(DISTINCT i.student_id) FILTER (WHERE t.status IN ('matched','reconciled')
                 AND (t.trans_time AT TIME ZONE $1) >= b.day_start)        AS students_paid_today,
        COUNT(*) FILTER (WHERE t.status = 'unmatched')                     AS unrec_count,
        COALESCE(SUM(t.trans_amount) FILTER (WHERE t.status = 'unmatched'), 0) AS unrec_amount
      FROM b
      LEFT JOIN mpesa_transactions t ON true
      LEFT JOIN invoices i ON i.id = t.matched_invoice_id
      GROUP BY b.day_start, b.month_start
      `,
      [TZ],
    );

    const [stk] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('failed','timeout')
                 AND initiated_at > now() - interval '24 hours')           AS failed,
        COUNT(*) FILTER (WHERE status = 'pending'
                 AND initiated_at < now() - interval '5 minutes'
                 AND initiated_at > now() - interval '24 hours')           AS pending
      FROM stk_requests
    `);

    // Arrears from earlier terms count too. Add "AND term_id = <active term>" for current term only.
    const [inv] = await this.dataSource.query(`
      SELECT COALESCE(SUM(balance), 0) AS outstanding
      FROM invoices WHERE status IN ('unpaid','partial')
    `);

    const n = (v: unknown) => Number(v ?? 0); // pg returns numeric/bigint as strings
    return {
      collectedToday: n(tx?.collected_today),
      collectedThisMonth: n(tx?.collected_month),
      outstandingFees: n(inv?.outstanding),
      studentsPaidToday: n(tx?.students_paid_today),
      unreconciled: { count: n(tx?.unrec_count), amount: n(tx?.unrec_amount) },
      failedOrPending: { failed: n(stk?.failed), pending: n(stk?.pending) },
      generatedAt: new Date().toISOString(),
    };
  }
}