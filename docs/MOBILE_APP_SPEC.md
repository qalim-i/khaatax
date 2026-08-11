# KhaataX — Mobile App Specification (v2)

*Owner + Manager app — simplified scope, no field/laborer access*

## 1. Scope & Users

This version reflects a deliberately narrow user base: only the business owner and a fixed set of 2-3 managers use the app. Laborers and field staff never touch the app — they report deliveries and stock movements verbally or on paper, and the owner or a manager enters that data. This removes the need for offline support, barcode/QR scanning, and any laborer-facing screens.

| Role | Who | Access |
|---|---|---|
| Owner | 1 person | Full access: Inventory, Expenses, Payroll |
| Manager | 2-3 people, fixed accounts | Full access: Inventory, Expenses. No access to Payroll. |

> Manager accounts are provisioned once by the developer at setup — the owner does not add/remove users from within the app.

## 2. What Was Removed From v1

- Offline-first architecture and sync — connectivity is reliable at the single location.
- Barcode/QR scanning — manual entry throughout.
- Serial-number-wise cylinder tracking — too much manual overhead without scanning.
- Attendance, leave, and advance-salary workflows — payroll is now just a list.
- Expense approval workflow — managers are trusted to log expenses directly.
- Receipt photo capture — expenses are amount + category + note only.
- All field/laborer-facing screens.

## 3. App Navigation

Bottom tab bar (4 tabs):

- **Home** — combined dashboard (Inventory + Expenses, and Payroll summary for Owner only)
- **Cylinders** — party ledger, stock, outstanding
- **Expenses** — log and view expenses
- **More** — Payroll (Owner only), settings, exports

Managers see the same tab bar, minus any Payroll entry point — it simply doesn't render for their role, and the underlying data is also blocked at the database level (see the Software Architecture Document, Section 8).

## 4. Home — Combined Dashboard

| Screen | Access | Purpose | Key Elements |
|---|---|---|---|
| Home Dashboard | Owner & Manager | Daily business snapshot | Cylinder KPI card (filled/empty/outstanding) · Expense KPI card (MTD spend) · Payroll KPI card (Owner only — this month's total payroll) |

## 5. Module 1 — Cylinder & Oxygen Inventory

Owner and Managers — identical access.

| Screen | Access | Purpose | Key Elements |
|---|---|---|---|
| Cylinder Dashboard | Owner & Manager | Daily snapshot | Filled / Empty / At-Customer / Under-Refill / Damaged tiles · Daily & monthly sales |
| Party Ledger | Owner & Manager | Track refill/return by customer | Searchable party list · Filled sent, empty received, running balance · Tap to open transaction history |
| Party Detail | Owner & Manager | Full transaction history | Date-wise table · Security deposit status · Generate Invoice & DC (separate running numbers) |
| New Transaction | Owner & Manager | Manual entry of a delivery/return | Party, date, cylinder type, filled sent, empty received · Auto-generates next Invoice No. and next DC No. · Updates party balance and stock |
| Stock Summary | Owner & Manager | Live inventory position | Filled / Empty / At Customer / Under Refill / Damaged counts, manually adjustable |
| Outstanding Report | Owner & Manager | Who owes cylinders | Filter by customer / date range / overdue days / cylinder type |

> Invoice and DC numbers are two independent global sequences (e.g. Invoice #201, DC #145 on the same transaction) — not tied to each other or to the party.

## 6. Module 2 — Payroll (Owner Only)

Deliberately minimal — a list, not a payroll system. Never visible to managers, at the UI or the data layer.

| Screen | Access | Purpose | Key Elements |
|---|---|---|---|
| Employee List | Owner only | See who's on payroll and what they're paid | Name, role, monthly pay · Simple add/edit/remove |
| Payroll Summary | Owner only | Total monthly payroll cost | Sum of all employee pay · Simple month-over-month view |

## 7. Module 3 — Company Expense Tracking

Owner and Managers — identical access, no approval step.

| Screen | Access | Purpose | Key Elements |
|---|---|---|---|
| Expense Dashboard | Owner & Manager | Spend overview | Total spend (today/MTD/YTD) · Category chart · Monthly trend chart |
| Add Expense | Owner & Manager | Quick capture | Category picker (Rent, Salaries, Electricity, Internet, Fuel, Vehicle Maintenance, Travel, Supplies, Marketing, Repairs, Utilities, Misc) · Amount · Note · Logged immediately, no approval |
| Expense List | Owner & Manager | Browse/search past expenses | Filter by category, date range, who logged it |
| Category Breakdown | Owner & Manager | Where money is going | Pie/bar chart by category · Tap to filter transaction list |

## 8. Platform

- Mobile app (React Native / Expo) — primary interface for both Owner and Managers.
- Web view (React + TypeScript) — Owner only, for checking things on a laptop. Mirrors the mobile app's data, same RLS rules apply.
- No offline mode — both apps assume connectivity.

## 9. Suggested Build Priority

1. **Phase 1**: Home Dashboard + Party Ledger + New Transaction + Stock Summary — the daily-use core.
2. **Phase 2**: Outstanding Report + Expense Dashboard + Add Expense + Expense List.
3. **Phase 3**: Payroll (Employee List + Summary), owner web view.
4. **Phase 4**: Exports (PDF invoice/DC/reports), polish, optional WhatsApp/SMS sharing of invoices.

---
*This is a leaner build than the original spec — no offline sync, no scanning, no approval engine, and payroll reduced to a simple list.*
