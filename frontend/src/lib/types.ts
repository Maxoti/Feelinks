export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export type AccountType = 'paybill' | 'till';
export type MpesaChannel = 'c2b' | 'stk';
export type MpesaTxStatus = 'unmatched' | 'matched' | 'reconciled' | 'rejected';

export interface Student {
  id: string;
  admissionNo: string;
  fullName: string;
  grade?: string;
  parentName?: string;
  parentPhone: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
}

export interface Term {
  id: string;
  year: number;
  termNumber: number;
  name: string;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  studentId: string;
  student?: Student;
  termId: string;
  term?: Term;
  amountDue: string;
  amountPaid: string;
  balance: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface BusinessAccount {
  id: string;
  label: string;
  shortcode: string;
  accountType: AccountType;
  isActive: boolean;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  transactionId: string;
  invoiceId: string;
  pdfUrl: string;
  issuedAt: string;
}

export interface StkRequest {
  id: string;
  invoiceId: string;
  checkoutRequestId: string;
  phone: string;
  amount: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
}
