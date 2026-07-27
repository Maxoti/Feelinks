'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import type { Student, Term } from '@/lib/types';

export default function NewInvoicePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [studentId, setStudentId] = useState('');
  const [termId, setTermId] = useState('');
  const [amountDue, setAmountDue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.students.list().then(setStudents).catch(() => {});
    api.terms.list().then((all) => {
      setTerms(all);
      const active = all.find((t) => t.isActive);
      if (active) setTermId(active.id);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const invoice = await api.invoices.create({ studentId, termId, amountDue });
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this invoice.');
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="New invoice" />
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Student</label>
          <select
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNo})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Term</label>
          <select
            required
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select a term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Amount due (KES)</label>
          <input
            required
            type="number"
            step="0.01"
            value={amountDue}
            onChange={(e) => setAmountDue(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {error && <p className="text-sm text-status-overdue">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create invoice'}</Button>
      </form>
    </>
  );
}
