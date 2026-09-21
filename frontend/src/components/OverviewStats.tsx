// -> frontend/src/components/OverviewStats.tsx
import Link from 'next/link';
import { Money } from '@/components/Money';
import type { OverviewStats } from '@/lib/types';

type CardColor = 'green' | 'blue' | 'orange' | 'purple' | 'amber' | 'red';

const COLOR_STYLES: Record<CardColor, { border: string; label: string; icon: string }> = {
  green: { border: 'border-l-accent', label: 'text-accent-dark', icon: 'bg-accent/10 text-accent-dark' },
  blue: { border: 'border-l-blue-600', label: 'text-blue-700', icon: 'bg-blue-50 text-blue-700' },
  orange: { border: 'border-l-orange-600', label: 'text-orange-700', icon: 'bg-orange-50 text-orange-700' },
  purple: { border: 'border-l-purple-600', label: 'text-purple-700', icon: 'bg-purple-50 text-purple-700' },
  amber: { border: 'border-l-status-partial', label: 'text-status-partial', icon: 'bg-status-partial/10 text-status-partial' },
  red: { border: 'border-l-status-overdue', label: 'text-status-overdue', icon: 'bg-status-overdue/10 text-status-overdue' },
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
        <Figure>{stats.studentsPaidToday}</Figure>
      </StatCard>

      {/* Add href="/payments" to the failed/pending card once that page exists */}
      <StatCard
        label="Needs matching"
        href="/reconciliation"
        color={u.count > 0 ? 'amber' : 'blue'}
        attention={u.count > 0}
        note={u.count > 0 ? <><Money amount={u.amount} /> not yet on a student invoice</> : 'All payments are matched'}
      >
        <Figure attention={u.count > 0} tone="amber">
          {u.count === 0 ? 'None' : `${u.count} payment${u.count > 1 ? 's' : ''}`}
        </Figure>
      </StatCard>

      <StatCard
        label="Failed or pending"
        color={failPend > 0 ? 'red' : 'blue'}
        attention={failPend > 0}
        note={
          failPend > 0
            ? `${f.failed} failed, ${f.pending} stuck pending (over 5 min), last 24 hours`
            : 'Last 24 hours'
        }
      >
        <Figure attention={failPend > 0} tone="red">
          {failPend === 0 ? 'None' : failPend}
        </Figure>
      </StatCard>
    </section>
  );
}

function Figure({
  children,
  attention,
  tone = 'amber',
}: {
  children: React.ReactNode;
  attention?: boolean;
  tone?: 'amber' | 'red';
}) {
  const attentionClass = tone === 'red' ? 'text-status-overdue' : 'text-status-partial';
  return (
    <p className={`text-xl font-semibold font-mono tabular-nums ${attention ? attentionClass : 'text-ink-950'}`}>
      {children}
    </p>
  );
}

function StatCard(props: {
  label: string;
  children: React.ReactNode;
  note?: React.ReactNode;
  href?: string;
  color: CardColor;
  attention?: boolean;
}) {
  const styles = COLOR_STYLES[props.color];

  const cls = [
    'block rounded-lg border border-slate-200 bg-white p-5 border-l-4',
    styles.border,
    props.href ? 'hover:border-accent/40' : '',
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