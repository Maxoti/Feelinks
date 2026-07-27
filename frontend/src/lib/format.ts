/**
 * All money and reference-number formatting lives here, deliberately kept
 * to tabular/mono figures — see globals.css `.figure` utility. An admin
 * scanning a column of amounts should never have digits drifting out of
 * alignment because of proportional-width fonts.
 */
export function formatKes(amount: string | number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPhone(msisdn: string): string {
  // 2547XXXXXXXX -> 07XX XXX XXX (locally recognizable format)
  if (/^254\d{9}$/.test(msisdn)) {
    const local = '0' + msisdn.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return msisdn;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'Unpaid',
    partial: 'Partially paid',
    paid: 'Paid',
    overpaid: 'Overpaid',
    unmatched: 'Needs review',
    matched: 'Matched',
    reconciled: 'Reconciled',
    rejected: 'Rejected',
    pending: 'Pending',
    success: 'Success',
    failed: 'Failed',
    timeout: 'Timed out',
  };
  return map[status] ?? status;
}
