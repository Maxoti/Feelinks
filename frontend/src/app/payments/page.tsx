// frontend/src/app/payments/page.tsx
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { formatKes, formatPhone, statusLabel } from '@/lib/format';
import type { MpesaTxStatus } from '@/lib/types';

const FILTERS: { value: '' | MpesaTxStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'reconciled', label: 'Reconciled' },
  { value: 'matched', label: 'Matched' },
  { value: 'unmatched', label: 'Needs review' },
  { value: 'rejected', label: 'Rejected' },
];

const BADGE: Record<string, string> = {
  reconciled: 'bg-accent/10 text-accent border-accent/30',
  matched: 'bg-slate-100 text-slate-700 border-slate-300',
  unmatched: 'bg-amber-50 text-amber-800 border-amber-300',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

// Vercel renders on a UTC server, so pin the timezone or every time shows 3 hours early.
const timeFmt = new Intl.DateTimeFormat('en-KE', {
  timeZone: 'Africa/Nairobi',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }> | { status?: string };
}) {
  const sp = await searchParams; // a Promise in newer Next versions, a plain object in older ones
  const status = FILTERS.find((f) => f.value && f.value === sp?.status)?.value || undefined;
  const rows = await api.transactions.recent(status).catch(() => null);

  return (
    <>
      <PageHeader title="Payments" />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? '') === f.value;
          return (
            <Link
              key={f.value || 'all'}
              href={f.value ? `/payments?status=${f.value}` : '/payments'}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                active ? 'border-accent bg-accent text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-accent/40'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {rows === null ? (
        <p className="text-sm text-red-700">Couldn&apos;t load payments. Check that the API is running, then refresh.</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No payments to show{status ? ' for this filter' : ' yet'}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">M-Pesa ref</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{timeFmt.format(new Date(r.transTime))}</td>
                  <td className="px-4 py-3">
                    {r.studentName ? (
                      r.invoiceId ? (
                        <Link href={`/invoices/${r.invoiceId}`} className="text-accent hover:underline">
                          {r.studentName}
                        </Link>
                      ) : (
                        r.studentName
                      )
                    ) : r.status === 'unmatched' ? (
                      <span className="text-amber-800">
                        Not identified{' '}
                        <Link href="/reconciliation" className="ml-1 text-accent hover:underline">
                          Match
                        </Link>
                      </span>
                    ) : (
                      <span className="text-slate-500">Not identified</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-slate-600">{formatPhone(r.msisdn)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">{formatKes(r.transAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{r.transId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${BADGE[r.status] ?? BADGE.matched}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && rows.length >= 100 && (
        <p className="mt-3 text-xs text-slate-500">Showing the 100 most recent payments.</p>
      )}
    </>
  );
}