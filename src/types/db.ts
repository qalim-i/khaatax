// Domain types for the app.
//
// Column PRESENCE and base types are derived from `supabase-generated.ts`, which
// is introspected from the live database (`npm run gen:types`). Hand-writing them
// against docs/TRD.md meant a renamed or dropped column stayed green until it
// failed at runtime — the whole shape was asserted with `as Party[]` at every
// call site and never actually checked. Deriving makes that a compile error.
//
// Two things are still declared by hand on top of the generated rows:
//
//   * The string unions. Postgres holds `role`, `status`, `method` and `category`
//     as `text` with CHECK constraints, so the generator can only see `string`.
//     The unions are narrower than the schema on purpose and are the reason this
//     file is not a bare re-export.
//   * The field comments. `balance` vs `amount_due` is the distinction this app
//     most needs to keep straight (CLAUDE.md), and a generated file cannot carry
//     that.
//
// Treat the TRD as source of truth for intent; treat the generated file as source
// of truth for what the database actually has.

import type { Database } from './supabase-generated';

type Tables = Database['public']['Tables'];

/** Replace named fields of a generated row with narrower hand-written ones. */
type Narrow<Row, Fields extends Partial<Record<keyof Row, unknown>>> = Omit<Row, keyof Fields> &
  Fields;

export type UserRole = 'owner' | 'manager';

export type StockStatus = 'filled' | 'empty' | 'at_customer' | 'under_refill' | 'damaged';

export type AppUser = Narrow<Tables['users']['Row'], { role: UserRole }>;

export type Party = Narrow<
  Tables['parties']['Row'],
  {
    /** Cylinders held by the party. A COUNT, not money. */
    balance: number;
    /**
     * Rupees the party owes: charges less payments (migration 0010).
     *
     * Negative means the party is in credit — an advance or an overpayment, both
     * ordinary here. Not interchangeable with `balance`; never render one where
     * the other belongs.
     */
    amount_due: number;
  }
>;

// Input for creating a party. `balance` is deliberately absent — it is a derived
// value moved only by the create_transaction RPC, never set from the client.
export interface PartyInput {
  name: string;
  contact: string | null;
  security_deposit: number;
}

export type Transaction = Narrow<
  Tables['transactions']['Row'],
  {
    /**
     * Rupees charged to the party for this transaction, entered by hand on New
     * Transaction and printed on both documents.
     *
     * Recorded, not accounted: this does NOT feed `parties.balance`, which is a
     * cylinder count. Rows written before migration 0009 carry 0.
     */
    amount: number;
  }
>;

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'cheque' | 'other';

/**
 * Money received from a party (migration 0010). Recorded against the party, not
 * matched to an invoice — KhaataX is a running account, not an AR system.
 *
 * Immutable: there is no update path. A wrong entry is removed via
 * `delete_payment`, which puts the money back on `parties.amount_due`, and
 * re-recorded.
 */
export type Payment = Narrow<Tables['payments']['Row'], { method: PaymentMethod }>;

// Input for the record_payment RPC. `created_by` is stamped by the server.
export interface RecordPaymentInput {
  party_id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
}

export type Stock = Narrow<Tables['stock']['Row'], { status: StockStatus }>;

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

export type Expense = Narrow<Tables['expenses']['Row'], { category: ExpenseCategory }>;

export type Employee = Tables['employees']['Row'];

// Input for the New Transaction server-side RPC (TRD Section 6.1).
// invoice_no / dc_no are never supplied by the client — the RPC assigns them.
export interface CreateTransactionInput {
  party_id: string;
  date: string;
  cylinder_type: string;
  filled_sent: number;
  empty_received: number;
  amount: number;
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
