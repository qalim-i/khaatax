// Mirrors the schema in docs/TRD.md Section 3. Treat the TRD as source of truth.

export type UserRole = 'owner' | 'manager';

export type StockStatus = 'filled' | 'empty' | 'at_customer' | 'under_refill' | 'damaged';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Party {
  id: string;
  name: string;
  contact: string | null;
  security_deposit: number;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  date: string;
  invoice_no: number;
  dc_no: number;
  cylinder_type: string;
  filled_sent: number;
  empty_received: number;
  created_by: string;
  created_at: string;
}

export interface Stock {
  status: StockStatus;
  quantity: number;
  updated_at: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Salaries'
  | 'Electricity'
  | 'Internet'
  | 'Fuel'
  | 'Vehicle Maintenance'
  | 'Travel'
  | 'Supplies'
  | 'Marketing'
  | 'Repairs'
  | 'Utilities'
  | 'Misc';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  monthly_pay: number;
  active: boolean;
  created_at: string;
}

// Input for the New Transaction server-side RPC (TRD Section 6.1).
// invoice_no / dc_no are never supplied by the client — the RPC assigns them.
export interface CreateTransactionInput {
  party_id: string;
  date: string;
  cylinder_type: string;
  filled_sent: number;
  empty_received: number;
}

export interface CreateTransactionResult {
  transaction: Transaction;
  party_balance: number;
}
