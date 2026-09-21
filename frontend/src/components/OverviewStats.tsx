// -> frontend/src/components/OverviewStats.tsx
import Link from 'next/link';
import { Money } from '@/components/Money';
import type { OverviewStats } from '@/lib/types';

type CardColor = 'green' | 'blue' | 'orange' | 'purple' | 'amber' | 'red';

const COLOR_STYLES: Record<CardColor, { bg: string; border: string; label: string; figure: string }> = {
  green: { bg: 'bg-accent/5', border: 'border-accent/30', label: 'text-accent-dark', figure: 'text-ink-950' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'text-blue-700', figure: 'text-ink-950' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-700', figure: 'text-ink-950' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', label: 'text-purple-700', figure: 'text-ink-950' },
  amber: { bg: 'bg-amber-50', border: 'border-status-partial/40', label: 'text-status-partial', figure: 'text-status-partial' },
  red: { bg: 'bg-red-50', border: 'border-status-overdue/40', label: 'text-status-overdue', figure: 'text-status-overdue' },
};

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
      <StatCard label="Collected today" color="green">
        <Money amount={stats.collectedToday} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Collected this month" color="blue">
        <Money amount={stats.collectedThisMonth} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Outstanding fees" href="/invoices" color="purple">
        <Money amount={stats.outstandingFees} className="text-xl font-semibold text-ink-950" />
      </StatCard>

      <StatCard label="Students who paid today" color="orange">
        <Figure color="orange">{stats.studentsPaidToday}</Figure>
      </StatCard>

      {/* Add href="/payments" to the failed/pending card once that page exists */}
      <StatCard
        label="Needs matching"
        href="/reconciliation"
        color={u.count > 0 ? 'amber' : 'blue'}
        note={u.count > 0 ? <><Money amount={u.amount} /> not yet on a student invoice</> : 'All payments are matched'}
      >
        <Figure color={u.count > 0 ? 'amber' : 'blue'}>
          {u.count === 0 ? 'None' : `${u.count} payment${u.count > 1 ? 's' : ''}`}
        </Figure>
      </StatCard>

      <StatCard
        label="Failed or pending"
        color={failPend > 0 ? 'red' : 'blue'}
        note={
          failPend > 0
            ? `${f.failed} failed, ${f.pending} stuck pending (over 5 min), last 24 hours`
            : 'Last 24 hours'
        }
      >
        <Figure color={failPend > 0 ? 'red' : 'blue'}>
          {failPend === 0 ? 'None' : failPend}
        </Figure>
      </StatCard>
    </section>
  );
}

function Figure({ children, color }: { children: React.ReactNode; color: CardColor }) {
  const cls = COLOR_STYLES[color].figure;
  return <p className={`text-xl font-semibold font-mono tabular-nums ${cls}`}>{children}</p>;
}

function StatCard(props: {
  label: string;
  children: React.ReactNode;
  note?: React.ReactNode;
  href?: string;
  color: CardColor;
}) {
  const styles = COLOR_STYLES[props.color];

  const cls = [
    'block rounded-lg border p-5 transition-colors',
    styles.bg,
    styles.border,
    props.href ? 'hover:border-accent/60' : '',
  ].join(' ');

  const body = (
    <>
      <p className={`text-xs mb-1 font-medium ${styles.label}`}>{props.label}</p>
      {props.children}
      {props.note && <p className="mt-1 text-xs text-slate-500">{props.note}</p>}
    </>
  );

  return props.href ? <Link href={props.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}