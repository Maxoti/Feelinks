'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ admissionNo: '', fullName: '', grade: '', parentName: '', parentPhone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.students.create(form);
      router.push('/students');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this student.');
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, required = true) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );

  return (
    <>
      <PageHeader title="Add student" />
      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {field('admissionNo', 'Admission number')}
        {field('fullName', 'Full name')}
        {field('grade', 'Grade', false)}
        {field('parentName', 'Parent name', false)}
        {field('parentPhone', 'Parent phone (2547XXXXXXXX)')}
        {error && <p className="text-sm text-status-overdue">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save student'}</Button>
      </form>
    </>
  );
}
