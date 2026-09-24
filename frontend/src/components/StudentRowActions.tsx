'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Student } from '@/lib/types';

// Row-level Edit / Deactivate actions for the Students table.
// Edit opens an inline panel below the row's own state (kept local to this
// component, not the page) so only one row's editor needs to render at a time.
export function StudentRowActions({ student }: { student: Student }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'editing' | 'confirming-deactivate'>('idle');
  const [form, setForm] = useState({
    fullName: student.fullName,
    grade: student.grade ?? '',
    parentName: student.parentName ?? '',
    parentPhone: student.parentPhone,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (student.status === 'inactive') {
    // Already deactivated — nothing actionable left for this row.
    return <span className="text-xs text-slate-400">Inactive</span>;
  }

  async function saveEdit() {
    setSaving(true);
    setError('');
    try {
      await api.students.update(student.id, form);
      setMode('idle');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    setSaving(true);
    setError('');
    try {
      await api.students.deactivate(student.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not deactivate this student.');
      setSaving(false);
    }
  }

  if (mode === 'idle') {
    return (
      <div className="flex justify-end gap-3 text-xs">
        <button type="button" onClick={() => setMode('editing')} className="text-accent hover:underline">
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMode('confirming-deactivate')}
          className="text-status-overdue hover:underline"
        >
          Deactivate
        </button>
      </div>
    );
  }

  if (mode === 'confirming-deactivate') {
    return (
      <div className="flex flex-col items-end gap-1 text-xs">
        <span>Deactivate {student.fullName}?</span>
        {error && <span className="text-status-overdue">{error}</span>}
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
            onClick={confirmDeactivate}
            disabled={saving}
            className="rounded bg-status-overdue px-2 py-1 text-white disabled:opacity-50"
          >
            {saving ? 'Deactivating\u2026' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  // mode === 'editing'
  return (
    <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-xs">
      <input
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        placeholder="Full name"
        className="w-full rounded border border-slate-300 px-2 py-1"
      />
      <input
        value={form.grade}
        onChange={(e) => setForm({ ...form, grade: e.target.value })}
        placeholder="Grade"
        className="w-full rounded border border-slate-300 px-2 py-1"
      />
      <input
        value={form.parentName}
        onChange={(e) => setForm({ ...form, parentName: e.target.value })}
        placeholder="Parent name"
        className="w-full rounded border border-slate-300 px-2 py-1"
      />
      <input
        value={form.parentPhone}
        onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
        placeholder="Parent phone (2547XXXXXXXX)"
        className="w-full rounded border border-slate-300 px-2 py-1"
      />
      {error && <p className="text-status-overdue">{error}</p>}
      <div className="flex justify-end gap-2">
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