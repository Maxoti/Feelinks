import type { Student, Term, Invoice, BusinessAccount, Receipt, StkRequest, OverviewStats, MpesaTransaction, MpesaTxStatus, MatchCandidate, PaymentRow, UpdateStudentPayload } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
 students: {
    list: () => request<Student[]>('/students'),
   get: (id: string) => request<Student>(`/students/${id}`),
     create: (data: Partial<Student>) =>
      request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
     update: (id: string, data: UpdateStudentPayload) =>
       request<Student>(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
   deactivate: (id: string) =>
       request<Student>(`/students/${id}/deactivate`, { method: 'PATCH' }),
   },
  terms: {
    list: () => request<Term[]>('/terms'),
    active: () => request<Term>('/terms/active'),
    create: (data: { year: number; termNumber: number; name: string; isActive?: boolean }) =>
      request<Term>('/terms', { method: 'POST', body: JSON.stringify(data) }),
    activate: (id: string) => request<Term>(`/terms/${id}/activate`, { method: 'PATCH' }),
  },
  invoices: {
    list: (studentId?: string) =>
      request<Invoice[]>(`/invoices${studentId ? `?studentId=${studentId}` : ''}`),
    get: (id: string) => request<Invoice>(`/invoices/${id}`),
    create: (data: { studentId: string; termId: string; amountDue: string }) =>
      request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  },
  businessAccounts: {
    list: () => request<BusinessAccount[]>('/business-accounts'),
    create: (data: Partial<BusinessAccount>) =>
      request<BusinessAccount>('/business-accounts', { method: 'POST', body: JSON.stringify(data) }),
  },
  receipts: {
    byInvoice: (invoiceId: string) => request<Receipt[]>(`/receipts/by-invoice/${invoiceId}`),
  },
  stk: {
    initiate: (invoiceId: string, phone: string) =>
      request<StkRequest>('/mpesa/stk/initiate', {
        method: 'POST',
        body: JSON.stringify({ invoiceId, phone }),
      }),
  },
  dashboard: {
    overview: () => request<OverviewStats>('/dashboard/overview'),
  },
  transactions: {
    recent: (status?: MpesaTxStatus) =>
      request<PaymentRow[]>(`/transactions/recent${status ? `?status=${status}` : ''}`),
    list: (status: MpesaTxStatus = 'unmatched') =>
      request<MpesaTransaction[]>(`/transactions?status=${status}`),
    candidates: (id: string) => request<MatchCandidate[]>(`/transactions/${id}/candidates`),
    assign: (id: string, invoiceId: string) =>
      request<MpesaTransaction>(`/transactions/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      }),
  },};

export { ApiError };
