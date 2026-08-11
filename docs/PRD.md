# Product Requirements Document (PRD)

## KhaataX — Owner + Manager App

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Status | Draft — for review |
| Related Documents | SAD.md, MOBILE_APP_SPEC.md, TRD.md |

---

## 1. Executive Summary

KhaataX is a mobile and web application for a single-location oxygen cylinder distribution business, used exclusively by the business owner and 2-3 fixed managers. It replaces manual/paper-based tracking of cylinder inventory, party balances, company expenses, and payroll with a simple, always-online tool. The product is deliberately narrow in scope: no field-staff access, no offline mode, no scanning, and a minimal payroll list rather than a full HR system.

## 2. Problem Statement

The business currently tracks party-wise cylinder deliveries/returns, stock levels, outstanding balances, company expenses, and staff pay manually or through informal methods. This makes it hard to answer basic questions quickly — how many cylinders are outstanding with a given party, what was spent this month, what the total payroll cost is — and creates risk of errors in invoice/DC numbering and balance tracking as transaction volume grows.

## 3. Goals & Objectives

- Give the owner a single, fast view of cylinder stock, party balances, expenses, and payroll cost.
- Let the owner and managers record transactions and expenses in under a minute, without paperwork.
- Guarantee payroll data is never visible to managers, without relying on manual discipline.
- Eliminate invoice/DC numbering errors from manual bookkeeping.
- Keep the system small enough that 1-2 developers can build and maintain it.

## 4. Users & Personas

| Persona | Description | Primary Needs |
|---|---|---|
| Owner | Business owner, sole person with full visibility including payroll | Daily oversight, financial control, payroll management, party/stock visibility |
| Manager (x2-3) | Trusted staff who run day-to-day operations | Fast transaction and expense entry, party/stock lookup |

> Note: laborers/field staff are explicitly not app users. They report deliveries and stock movements verbally or on paper to the owner or a manager, who enters the data.

## 5. Scope

### 5.1 In Scope

- Cylinder & Oxygen Inventory: party ledger, transactions, stock summary, outstanding report, Invoice & DC generation
- Company Expense Tracking: direct expense logging (amount/category/note), dashboard, category breakdown, trend
- Payroll: employee list with monthly pay, payroll summary — Owner only
- Combined Home dashboard across all modules
- Mobile app (Owner + Managers) and a web view (Owner only)

### 5.2 Out of Scope

- Field/laborer app access of any kind
- Offline mode / offline data capture
- Barcode/QR scanning
- Serial-number-wise cylinder tracking
- Attendance, leave, or advance-salary workflows
- Expense approval workflow
- Receipt/photo capture for expenses
- Multi-branch/multi-location support
- Self-service user management (manager accounts are provisioned once by the developer)

## 6. Functional Requirements

### 6.1 Module: Cylinder & Oxygen Inventory

| ID | User Story | Acceptance Criteria | Priority |
|---|---|---|---|
| INV-1 | As an Owner or Manager, I want to record a new transaction for a party (filled sent / empty received) so cylinder movement is tracked. | Transaction saves with auto-generated Invoice No. and DC No.; party balance updates immediately; stock counts adjust accordingly. | Must |
| INV-2 | As an Owner or Manager, I want to view a party's full transaction history so I can resolve balance questions. | Date-wise list of all transactions for the party, showing filled sent, empty received, running balance, invoice/DC numbers. | Must |
| INV-3 | As an Owner or Manager, I want to see current stock levels by status so I know what's available. | Dashboard shows Filled / Empty / At Customer / Under Refill / Damaged counts, manually adjustable. | Must |
| INV-4 | As an Owner or Manager, I want to see which parties have overdue cylinder balances so I can follow up. | Outstanding report filterable by customer, date range, overdue days, and cylinder type. | Must |
| INV-5 | As an Owner or Manager, I want to generate a PDF of an Invoice or DC so I can share it with a party. | PDF generated on demand with correct Invoice/DC number, party details, and transaction line items. | Should |
| INV-6 | As an Owner or Manager, I want to search/filter the party list so I can quickly find a customer. | Search by name returns matching parties within 1 second for expected data volumes. | Should |

### 6.2 Module: Company Expense Tracking

| ID | User Story | Acceptance Criteria | Priority |
|---|---|---|---|
| EXP-1 | As an Owner or Manager, I want to log an expense with amount, category, and note so spending is tracked. | Expense saves immediately with no approval step; appears in expense list and dashboard totals right away. | Must |
| EXP-2 | As an Owner or Manager, I want to see total spend for today/this month/this year so I understand current spending. | Dashboard tiles show correct running totals for each period. | Must |
| EXP-3 | As an Owner or Manager, I want to see a category breakdown of expenses so I know where money goes. | Chart (pie or bar) grouped by category; tapping a category filters the expense list. | Should |
| EXP-4 | As an Owner or Manager, I want to see a monthly expense trend so I can spot changes over time. | Line/bar chart of monthly totals over a rolling period (e.g. 12 months). | Could |
| EXP-5 | As an Owner or Manager, I want to filter/search past expenses so I can find a specific entry. | Filter by category, date range, and who logged it. | Should |

### 6.3 Module: Payroll (Owner Only)

| ID | User Story | Acceptance Criteria | Priority |
|---|---|---|---|
| PAY-1 | As an Owner, I want to maintain a list of employees with their monthly pay so I know payroll costs. | Owner can add, edit, and remove employee entries (name, role, monthly pay). | Must |
| PAY-2 | As an Owner, I want to see total monthly payroll cost so I can budget. | Summary shows sum of all active employees' monthly pay. | Must |
| PAY-3 | As a Manager, I must never be able to see or access payroll data. | Payroll tab/screens do not render for Manager role; API/database requests for employee data return no data for Manager role, verified by direct query, not just UI absence. | Must |

### 6.4 Cross-Cutting

| ID | User Story | Acceptance Criteria | Priority |
|---|---|---|---|
| GEN-1 | As an Owner, I want a combined Home dashboard summarizing inventory, expenses, and (for me only) payroll. | Single screen with KPI cards for each module the logged-in role has access to. | Must |
| GEN-2 | As a Manager, I want to log in with credentials set up for me so I can use the app. | Login via email/password (or OTP) using an account provisioned by the developer; no self-service signup. | Must |
| GEN-3 | As an Owner, I want to access a simple web view on my laptop mirroring the mobile app. | Web view shows the same Inventory, Expenses, and Payroll data, governed by the same access rules as mobile. | Should |

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard and list screens load in under 2 seconds on normal mobile data |
| Security | Payroll data is inaccessible to Manager role at the database level, not only hidden in the UI |
| Reliability | No data loss on normal app use; daily automated backups of all data |
| Usability | Core daily actions (new transaction, add expense) reachable within 2 taps of the Home screen |
| Availability | Standard managed-backend uptime; app assumes reliable connectivity, no offline fallback required |

## 8. Release Plan

| Phase | Contents |
|---|---|
| Phase 1 | Home Dashboard, Party Ledger, New Transaction, Stock Summary |
| Phase 2 | Outstanding Report, Expense Dashboard, Add Expense, Expense List |
| Phase 3 | Payroll (Employee List + Summary), Owner web view |
| Phase 4 | PDF export for Invoice/DC/reports, polish, optional WhatsApp/SMS sharing |

## 9. Success Metrics

- Owner can answer "what's outstanding with Party X" and "what's this month's payroll cost" in under 10 seconds using the app.
- All transactions and expenses are logged digitally within the same day they occur, replacing paper records.
- Zero incidents of a manager viewing payroll data.
- No duplicate or out-of-sequence invoice/DC numbers.

## 10. Assumptions & Dependencies

- The business continues to operate from a single location for the foreseeable future.
- The 2-3 manager accounts remain a fixed, small set; no near-term need for self-service user management.
- Reliable mobile/WiFi connectivity is available at the point of data entry.
- Depends on the Software Architecture Document v2 and Technical Requirements Document for implementation detail.

## 11. Open Questions

- Should WhatsApp/SMS sharing of invoices/DC be included in the initial release or deferred to a later phase?
- Does the owner want the ability to edit/void a transaction after creation, and if so, how should that affect invoice/DC numbering?
- Should employees in the Payroll list be soft-deleted (kept for history) or hard-deleted when they leave?
