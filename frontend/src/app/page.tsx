// -> frontend/src/app/page.tsx   (replaces your current Overview page)
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Money } from '@/components/Money';
import { StatusBadge } from '@/components/StatusBadge';
import { OverviewStatsGrid } from '@/components/OverviewStats';
import { AutoRefresh } from '@/components/AutoRefresh';

export default async function OverviewPage() {
  const [students, invoices, activeTerm, stats] = await Promise.all([
    api.students.list().catch(() => []),
    api.invoices.list().catch(() => []),
    api.terms.active().catch(() => null),
    api.dashboard.overview().catch(() => null),
  ]);

  const recentUnpaid = invoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
    .slice(0, 8);

  return (
    <>
      <PageHeader title="Overview" />
      <AutoRefresh />

      <p className="text-sm text-slate-500 -mt-2 mb-5">
        {activeTerm?.name ?? 'No active term'} &middot; <span className="font-mono tabular-nums">{students.length}</span> students
      </p>

      <OverviewStatsGrid stats={stats} />

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