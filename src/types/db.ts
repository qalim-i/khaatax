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

// Input for creating a party. `balance` is deliberately absent — it is a derived
// value moved only by the create_transaction RPC, never set from the client.
export interface PartyInput {
  name: string;
  contact: string | null;
  security_deposit: number;
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

// Input for logging an expense. `created_by` is stamped from the session by the
// hook, not chosen by the caller.
export interface CreateExpenseInput {
  date: string;
  amount: number;
  category: ExpenseCategory;
  note: string | null;
}

// Payroll entry input. `active` is not settable here — an employee starts active
// and is retired via the soft-delete path, never created inactive.
export interface EmployeeInput {
  name: string;
  role: string | null;
  monthly_pay: number;
}
