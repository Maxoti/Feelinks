import { formatKes } from '@/lib/format';

/**
 * The one signature convention for this app: every monetary figure renders
 * in tabular-mono digits so columns of amounts stay vertically aligned —
 * this is a ledger, and ledgers should read like one.
 */
export function Money({ amount, className = '' }: { amount: string | number; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{formatKes(amount)}</span>;
}
