'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';

export default function NewBusinessAccountPage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [accountType, setAccountType] = useState<'paybill' | 'till'>('paybill');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.businessAccounts.create({ label, shortcode, accountType });
      router.push('/business-accounts');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this business account.');
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add business account" />
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input
            required
            placeholder="e.g. Main School Paybill"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Shortcode</label>
          <input
            required
            placeholder="e.g. 4463675"
            value={shortcode}
            onChange={(e) => setShortcode(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as 'paybill' | 'till')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="paybill">Paybill</option>
            <option value="till">Till (Buy Goods)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Till payments carry no account reference — this determines how the reconciliation
            worker matches incoming transactions for this shortcode.
          </p>
        </div>
        {error && <p className="text-sm text-status-overdue">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save account'}</Button>
      </form>
    </>
  );
}
