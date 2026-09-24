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


export interface OverviewStats {
  collectedToday: number;
  collectedThisMonth: number;
  outstandingFees: number;
  studentsPaidToday: number;
  unreconciled: { count: number; amount: number };
  failedOrPending: { failed: number; pending: number };
  generatedAt: string;
}

export interface MpesaTransaction {
  id: string;
  transId: string;
  channel: MpesaChannel;
  accountType: AccountType;
  msisdn: string;
  transAmount: string;
  billRefNumber: string | null;
  transTime: string;
  status: MpesaTxStatus;
  matchConfidence: string | null;
}

export type MatchReason = 'admission_no' | 'phone';

export interface MatchCandidate {
  invoiceId: string;
  studentName: string;
  admissionNo: string;
  grade: string | null;
  termName: string;
  balance: string;
  status: InvoiceStatus;
  reasons: MatchReason[];
}

export interface PaymentRow extends MpesaTransaction {
  studentName: string | null;
  admissionNo: string | null;
  invoiceId: string | null;
}

export interface UpdateStudentPayload {
  fullName?: string;
  grade?: string;
  parentName?: string;
  parentPhone?: string;
  status?: Student['status'];
}