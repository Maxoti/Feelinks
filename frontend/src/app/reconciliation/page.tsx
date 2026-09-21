// -> frontend/src/app/reconciliation/page.tsx
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ReconciliationQueue } from '@/components/ReconciliationQueue';

export default async function ReconciliationPage() {
  const [transactions, invoices] = await Promise.all([
    api.transactions.list('unmatched').catch(() => null),
    api.invoices.list().catch(() => []),
  ]);

  // Only what the manual picker needs, passed once for the whole queue.
  const openInvoices = invoices
    .filter((i) => i.status === 'unpaid' || i.status === 'partial')
    .map((i) => ({
      id: i.id,
      label: `${i.student?.fullName ?? 'Unknown student'} (${i.student?.admissionNo ?? '-'}), ${i.term?.name ?? ''}`,
      balance: i.balance,
    }));

  return (
    <>
      <PageHeader title="Reconciliation" />
      {transactions === null ? (
        <p className="text-sm text-red-700">Couldn&rsquo;t load payments. Check that the API is running, then refresh.</p>
      ) : (
        <ReconciliationQueue transactions={transactions} openInvoices={openInvoices} />
      )}
    </>
  );
}