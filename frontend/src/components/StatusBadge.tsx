import { statusLabel } from '@/lib/format';

const STYLES: Record<string, string> = {
  paid: 'bg-status-paid/10 text-status-paid border-status-paid/30',
  reconciled: 'bg-status-paid/10 text-status-paid border-status-paid/30',
  success: 'bg-status-paid/10 text-status-paid border-status-paid/30',
  partial: 'bg-status-partial/10 text-status-partial border-status-partial/30',
  pending: 'bg-status-partial/10 text-status-partial border-status-partial/30',
  matched: 'bg-status-partial/10 text-status-partial border-status-partial/30',
  unpaid: 'bg-status-unpaid/10 text-status-unpaid border-status-unpaid/30',
  unmatched: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30',
  overpaid: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30',
  rejected: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30',
  failed: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30',
  timeout: 'bg-status-overdue/10 text-status-overdue border-status-overdue/30',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {statusLabel(status)}
    </span>
  );
}
