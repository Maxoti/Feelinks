import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Money } from '@/components/Money';
import { StatusBadge } from '@/components/StatusBadge';
import { StkPushForm } from '@/components/StkPushForm';
import { formatDate } from '@/lib/format';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await api.invoices.get(params.id).catch(() => null);
  if (!invoice) notFound();

  const receipts = await api.receipts.byInvoice(invoice.id).catch(() => []);

  return (
    <>
      <PageHeader title={invoice.student?.fullName ?? 'Invoice'} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Amount due</p>
          <Money amount={invoice.amountDue} className="text-lg font-semibold" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Balance</p>
          <Money amount={invoice.balance} className="text-lg font-semibold" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <div className="mt-1"><StatusBadge status={invoice.status} /></div>
        </div>
      </div>

      {invoice.status !== 'paid' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 mb-6">
          <h2 className="text-sm font-medium text-ink-950 mb-3">Collect payment via STK push</h2>
          <StkPushForm invoiceId={invoice.id} defaultPhone={invoice.student?.parentPhone} />
        </div>
      )}

      <h2 className="text-sm font-medium text-slate-600 mb-3">Receipts</h2>
      {receipts.length === 0 ? (
        <p className="text-sm text-slate-500">No receipts issued for this invoice yet.</p>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <a
              key={r.id}
              href={r.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-accent/40"
            >
              <span className="font-mono text-sm">Receipt #{r.receiptNo}</span>
              <span className="text-xs text-slate-500">{formatDate(r.issuedAt)}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
