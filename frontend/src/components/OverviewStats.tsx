// -> frontend/src/components/OverviewStats.tsx
import Link from 'next/link';
import { Money } from '@/components/Money';
import type { OverviewStats } from '@/lib/types';

export function OverviewStatsGrid({ stats }: { stats: OverviewStats | null }) {
  if (!stats) {
    return (
      <p className="mb-8 text-sm text-red-700">
        Couldn&rsquo;t load today&rsquo;s figures. Check that the API is running, then refresh.
      </p>
    );
  }

  const { unreconciled: u, failedOrPending: f } = stats;
  const failPend = f.failed + f.pending;

  return (
    <section aria-label="Collections overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatCard label="Collected today">
        <Money amount={stats.collectedToday} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Collected this month">
        <Money amount={stats.collectedThisMonth} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Outstanding fees" href="/invoices">
        <Money amount={stats.outstandingFees} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Students who paid today">
        <Figure>{stats.studentsPaidToday}</Figure>
      </StatCard>

      {/* Add href="/payments" to the failed/pending card once that page exists */}
      <StatCard
        label="Needs matching"
        href="/reconciliation"
        attention={u.count > 0}
        note={u.count > 0 ? <><Money amount={u.amount} /> not yet on a student invoice</> : 'All payments are matched'}
      >
        <Figure attention={u.count > 0}>{u.count === 0 ? 'None' : `${u.count} payment${u.count > 1 ? 's' : ''}`}</Figure>
      </StatCard>

      <StatCard
        label="Failed or pending"
        attention={failPend > 0}
        note={
          failPend > 0
            ? `${f.failed} failed, ${f.pending} stuck pending (over 5 min), last 24 hours`
            : 'Last 24 hours'
        }
      >
        <Figure attention={failPend > 0}>{failPend === 0 ? 'None' : failPend}</Figure>
      </StatCard>
    </section>
  );
}

function Figure({ children, attention }: { children: React.ReactNode; attention?: boolean }) {
  return (
    <p className={`text-xl font-semibold font-mono tabular-nums ${attention ? 'text-amber-700' : 'text-ink-950'}`}>
      {children}
    </p>
  );
}

function StatCard(props: {
  label: string;
  children: React.ReactNode;
  note?: React.ReactNode;
  href?: string;
  attention?: boolean;
}) {
  const cls = [
    'block rounded-lg border border-slate-200 bg-white p-5',
    props.attention ? 'border-l-4 border-l-amber-600' : '',
    props.href ? 'hover:border-accent/40' : '',
  ].join(' ');

  const body = (
    <>
      <p className="text-xs text-slate-500 mb-1">{props.label}</p>
      {props.children}
      {props.note && <p className="mt-1 text-xs text-slate-500">{props.note}</p>}
    </>
  );

  return props.href ? <Link href={props.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}