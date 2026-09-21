// -> frontend/src/components/ReconciliationQueue.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatKes, formatPhone, formatDate } from '@/lib/format';
import type { MatchCandidate, MpesaTransaction } from '@/lib/types';

type OpenInvoice = { id: string; label: string; balance: string };

export function ReconciliationQueue({
  transactions,
  openInvoices,
}: {
  transactions: MpesaTransaction[];
  openInvoices: OpenInvoice[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Nothing to match. Every payment received has been assigned to an invoice.
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-600">
        These payments arrived but couldn&rsquo;t be matched to an invoice automatically. Pick the right invoice for each one.
      </p>
      <ul className="space-y-2">
        {transactions.map((tx) => (
          <li key={tx.id} className="rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              aria-expanded={openId === tx.id}
              onClick={() => setOpenId(openId === tx.id ? null : tx.id)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <div>
                <p className="font-mono tabular-nums text-sm font-semibold text-ink-950">{formatKes(tx.transAmount)}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{formatPhone(tx.msisdn)}</span>
                  {' \u00B7 '}
                  <span className="font-mono">{tx.transId}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{tx.billRefNumber ? `Reference: ${tx.billRefNumber}` : 'No reference entered'}</p>
                <p>
                  {formatDate(tx.transTime)},{' '}
                  {new Date(tx.transTime).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </button>
            {openId === tx.id && <MatchPanel tx={tx} openInvoices={openInvoices} onDone={() => setOpenId(null)} />}
          </li>
        ))}
      </ul>
    </>
  );
}

function MatchPanel({ tx, openInvoices, onDone }: { tx: MpesaTransaction; openInvoices: OpenInvoice[]; onDone: () => void }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load suggestions when the panel opens.
  useEffect(() => {
    let cancelled = false;
    api.transactions
      .candidates(tx.id)
      .then((c) => {
        if (cancelled) return;
        setCandidates(c);
        if (c.length === 1) setSelected(c[0].invoiceId); // single suggestion pre-selected; still needs a click to confirm
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [tx.id]);

  const balance =
    candidates?.find((c) => c.invoiceId === selected)?.balance ??
    openInvoices.find((i) => i.id === selected)?.balance;
  const paid = Number(tx.transAmount);
  const outcome =
    balance === undefined
      ? null
      : paid < Number(balance)
        ? `Invoice will be partly paid. ${formatKes(Number(balance) - paid)} will remain.`
        : paid === Number(balance)
          ? 'This clears the invoice.'
          : `This is ${formatKes(paid - Number(balance))} more than the balance. The invoice will show as overpaid.`;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await api.transactions.assign(tx.id, selected);
      onDone();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn\u2019t assign this payment. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-slate-200 px-4 py-4 space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">Suggested invoices</p>
        {candidates === null && !loadError && <p className="text-sm text-slate-500">Looking for matches&hellip;</p>}
        {loadError && <p className="text-sm text-red-700">Couldn&rsquo;t load suggestions. You can still choose an invoice below.</p>}
        {candidates?.length === 0 && (
          <p className="text-sm text-slate-500">No invoice matches this reference or phone number. Choose one below.</p>
        )}
        <div className="space-y-2">
          {candidates?.map((c) => (
            <label
              key={c.invoiceId}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 has-[:checked]:border-accent"
            >
              <span className="flex items-center gap-3">
                <input type="radio" name={`inv-${tx.id}`} checked={selected === c.invoiceId} onChange={() => setSelected(c.invoiceId)} />
                <span>
                  <span className="block text-sm font-medium text-ink-950">
                    {c.studentName} <span className="font-normal text-slate-500">({c.admissionNo})</span>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {c.termName} &middot; {c.reasons.includes('admission_no') && 'Reference matches admission number'}
                    {c.reasons.length === 2 && ', '}
                    {c.reasons.includes('phone') && 'Paid from parent\u2019s phone'}
                  </span>
                </span>
              </span>
              <span className="font-mono tabular-nums text-sm">{formatKes(c.balance)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`other-${tx.id}`} className="mb-1 block text-xs font-medium text-slate-600">
          Or choose another invoice
        </label>
        <select
          id={`other-${tx.id}`}
          value={openInvoices.some((i) => i.id === selected) && !candidates?.some((c) => c.invoiceId === selected) ? selected : ''}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select an invoice</option>
          {openInvoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}, balance {formatKes(i.balance)}
            </option>
          ))}
        </select>
      </div>

      {outcome && <p className="text-sm text-slate-700">{outcome}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button
        type="button"
        disabled={!selected || saving}
        onClick={confirm}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Assigning\u2026' : 'Assign payment to invoice'}
      </button>
    </div>
  );
}