'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from './Button';

export function StkPushForm({ invoiceId, defaultPhone }: { invoiceId: string; defaultPhone?: string }) {
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');
    try {
      await api.stk.initiate(invoiceId, phone);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not send the STK push. Try again.');
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-status-paid">
        STK push sent to {phone}. Waiting for the parent to enter their M-Pesa PIN.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-600 mb-1">Parent phone</label>
        <input
          type="tel"
          required
          pattern="254[17]\d{8}"
          placeholder="2547XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send STK push'}
      </Button>
      {status === 'error' && <p className="text-sm text-status-overdue">{errorMessage}</p>}
    </form>
  );
}
