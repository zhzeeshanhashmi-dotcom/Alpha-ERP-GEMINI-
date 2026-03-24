export type UserRole = 'admin' | 'member';
export type UserStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  id: number;
  username: string;
  displayName: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Session {
  username: string;
  displayName: string;
  role: UserRole;
  loggedInAt: string;
}

export type LedgerType = 'Deposit' | 'Credit' | 'Payables' | 'Receivables';
export type PaymentMode = 'Cash' | 'Cheque' | 'Bank Transfer' | 'Online Transfer' | 'N/A';

export interface LedgerEntry {
  id: number; // Sr no
  date: string;
  desc: string;
  amount: number;
  type: LedgerType;
  cat: string;
  subCat?: string;
  projectName?: string;
  caseName?: string;
  refNo?: string; // Reference No (Transactions)
  remarks?: string;
  // Specific fields for logic
  investorName?: string;
  investmentAction?: 'Taken' | 'Return';
  earnestStatus?: 'Deposited' | 'Won (Held as Guarantee)' | 'Released';
}

export interface LineItem {
  desc: string;
  qty: number;
  rate: number;
  taxPercent: number;
}

export interface Quotation {
  id: number;
  subject: string;
  client: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Converted';
  gst: number;
  wht: number;
  notes: string;
  items: LineItem[];
}

export interface Invoice {
  id: number;
  num: string;
  subject: string;
  client: string;
  date: string;
  status: 'Not Received' | 'Received' | 'Partial';
  gst: number;
  wht: number;
  notes: string;
  items: LineItem[];
  ledger_id?: number;
}

export interface Challan {
  id: number;
  subject: string;
  client: string;
  date: string;
  status: 'Pending' | 'Dispatched' | 'Delivered';
  items: LineItem[];
  notes: string;
  address: string;
  ref_invoice?: string;
}

export interface Investment {
  id: number;
  caseName: string;
  investorName: string;
  takenTotal: number;
  returnedTotal: number;
  amount: number;
  profit: number;
  returned: number;
  date: string;
  lastDate: string;
  expected: string;
  ledger_ids: number[];
  return_entries: number[];
  status: 'Active' | 'Settled';
}

export interface EarnestMoney {
  id: number;
  caseName: string;
  desc: string;
  party: string;
  date: string;
  lastDate: string;
  voucherNo?: string;
  reference?: string;
  submittedTotal: number;
  returnedTotal: number;
  amount: number;
  paymentMode?: PaymentMode;
  bank?: string;
  chequeNo?: string;
  remarks?: string;
  caseNo?: string;
  tenderRef?: string;
  status: string;
  ledger_ids: number[];
  debit_ledger_id?: number | null;
  credit_ledger_id?: number | null;
  return_date?: string | null;
}
