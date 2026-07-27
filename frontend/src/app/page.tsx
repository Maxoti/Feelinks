import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Money } from '@/components/Money';
import { StatusBadge } from '@/components/StatusBadge';

export default async function OverviewPage() {
  const [students, invoices, activeTerm] = await Promise.all([
    api.students.list().catch(() => []),
    api.invoices.list().catch(() => []),
    api.terms.active().catch(() => null),
  ]);

  const outstanding = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + Number(inv.balance), 0);

  const recentUnpaid = invoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
    .slice(0, 8);

  return (
    <>
      <PageHeader title="Overview" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Active term</p>
          <p className="text-lg font-semibold text-ink-950">{activeTerm?.name ?? 'None set'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Students</p>
          <p className="text-lg font-semibold text-ink-950 font-mono tabular-nums">{students.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 mb-1">Outstanding balance</p>
          <Money amount={outstanding} className="text-lg font-semibold text-ink-950" />
        </div>
      </div>

      <h2 className="text-sm font-medium text-slate-600 mb-3">Invoices needing attention</h2>
      <div className="space-y-2">
        {recentUnpaid.length === 0 && (
          <p className="text-sm text-slate-500">No outstanding invoices right now.</p>
        )}
        {recentUnpaid.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-accent/40"
          >
            <div>
              <p className="text-sm font-medium text-ink-950">{inv.student?.fullName ?? inv.studentId}</p>
              <p className="text-xs text-slate-500">{inv.term?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Money amount={inv.balance} className="text-sm" />
              <StatusBadge status={inv.status} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
