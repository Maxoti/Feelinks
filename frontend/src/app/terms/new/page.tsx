'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';

export default function NewTermPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [termNumber, setTermNumber] = useState(1);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.terms.create({ year, termNumber, name, isActive });
      router.push('/terms');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this term.');
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add term" />
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <input
            type="number"
            required
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Term number</label>
          <select
            value={termNumber}
            onChange={(e) => setTermNumber(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input
            required
            placeholder="e.g. Term 2 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Set as the active term
        </label>
        {error && <p className="text-sm text-status-overdue">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save term'}</Button>
      </form>
    </>
  );
}
