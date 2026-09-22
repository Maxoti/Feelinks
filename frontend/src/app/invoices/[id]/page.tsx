import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Money } from '@/components/Money';
import { StatusBadge } from '@/components/StatusBadge';
import { StkPushForm } from '@/components/StkPushForm';
import { formatDate } from '@/lib/format';

const STATUS_CARD_BG: Record<string, string> = {
  paid: 'bg-accent',
  reconciled: 'bg-accent',
  success: 'bg-accent',
  partial: 'bg-status-partial',
  pending: 'bg-status-partial',
  matched: 'bg-status-partial',
  unpaid: 'bg-slate-500',
  overpaid: 'bg-status-overdue',
  unmatched: 'bg-status-overdue',
  rejected: 'bg-status-overdue',
  failed: 'bg-status-overdue',
  timeout: 'bg-status-overdue',
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await api.invoices.get(params.id).catch(() => null);
  if (!invoice) notFound();

  const receipts = await api.receipts.byInvoice(invoice.id).catch(() => []);

  const balanceCleared = Number(invoice.balance) <= 0;
  const statusBg = STATUS_CARD_BG[invoice.status] ?? 'bg-slate-500';

  return (
    <>
      <PageHeader title={invoice.student?.fullName ?? 'Invoice'} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg bg-blue-600 p-5">
          <p className="text-xs text-white/80 mb-1">Amount due</p>
          <Money amount={invoice.amountDue} className="text-lg font-semibold text-white" />
        </div>
        <div className={`rounded-lg p-5 ${balanceCleared ? 'bg-accent' : 'bg-orange-500'}`}> </div>
          <p className="text-xs text-white/80 mb-1">Balance</p>
          <Money amount={invoice.balance} className="text-lg" ></Money>
        </div>
        <div className={`rounded-lg p-5 ${statusBg}`}>
          <p className="text-xs text-white/80 mb-1">Status</p>
          <StatusBadge status={invoice.status} />
        </div>

   </>)}