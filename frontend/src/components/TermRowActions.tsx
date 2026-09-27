'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Term } from '@/lib/types';

// Row-level Edit / Delete actions for the Terms table.
export function TermRowActions({ term }: { term: Term }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'editing' | 'confirming-delete'>('idle');
  const [form, setForm] = useState({ year: term.year, termNumber: term.termNumber });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    setSaving(true);
    setError('');
    try {
      await api.terms.update(term.id, form);
      setMode('idle');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setSaving(true);
    setError('');
    try {
      await api.terms.remove(term.id);
      router.refresh();
    } catch (err) {
      // Most likely a ConflictException from the backend ("N invoices still
      // reference it") — shown as-is, since it's already a clear message.
      setError(err instanceof ApiError ? err.message : 'Could not delete this term.');
      setSaving(false);
    }
  }

  if (mode === 'idle') {
    return (
      <div className="flex justify-end gap-3 text-xs">
        <button type="button" onClick={() => setMode('editing')} className="text-accent hover:underline">
          Edit
        </button>
        {!term.isActive && (
          <button
            type="button"
            onClick={() => setMode('confirming-delete')}
            className="text-status-overdue hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    );
  }

  if (mode === 'confirming-delete') {
    return (
      <div className="flex flex-col items-end gap-1 text-xs">
        <span>Delete {term.name}?</span>
        {error && <span className="max-w-xs text-right text-status-overdue">{error}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={saving}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={saving}
            className="rounded bg-status-overdue px-2 py-1 text-white disabled:opacity-50"
          >
            {saving ? 'Deleting\u2026' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  // mode === 'editing'
  return (
    <div className="mt-2 flex flex-col items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex w-full gap-2">
        <input
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
          placeholder="Year"
          className="w-1/2 rounded border border-slate-300 px-2 py-1"
        />
        <select
          value={form.termNumber}
          onChange={(e) => setForm({ ...form, termNumber: Number(e.target.value) })}
          className="w-1/2 rounded border border-slate-300 px-2 py-1"
        >
          <option value={1}>Term 1</option>
          <option value={2}>Term 2</option>
          <option value={3}>Term 3</option>
        </select>
      </div>
      {error && <p className="text-status-overdue">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('idle')}
          disabled={saving}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveEdit}
          disabled={saving}
          className="rounded bg-solar px-2 py-1 text-ink-950 disabled:opacity-50"
        >
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
    </div>
  );
}