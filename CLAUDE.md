# CLAUDE.md

Project context for Claude Code. Read this before making changes. If a request conflicts with anything here, flag it rather than silently deviating.

## Project

**KhaataX** — a mobile + web app for a single-location oxygen cylinder distribution business. Replaces manual/paper tracking of cylinder inventory, party (customer) balances, company expenses, and payroll.

Full specs live in `/docs`:
- `PRD.md` — product requirements, user stories, priorities
- `TRD.md` — schema, RLS policies, numbering logic, non-functional requirements
- `SAD.md` — architecture, component breakdown
- `MOBILE_APP_SPEC.md` — screen-by-screen UI spec

Treat the TRD as the source of truth for schema and security rules; treat the PRD as the source of truth for feature scope and priority.

## Users — this is small and fixed, do not over-build

- **Owner** (1 person) — full access to everything: Inventory, Expenses, Payroll.
- **Manager** (2-3 people, fixed accounts) — full access to Inventory and Expenses. **Zero access to Payroll**, enforced at the database level via RLS, not just hidden in the UI.
- Manager accounts are provisioned once via Supabase Auth by the developer. There is no in-app user management / self-service signup. Do not build one.
- No other roles exist. No field staff, laborers, HR, or accountant roles use this app.

## Explicitly Out of Scope — do not build these

- Offline mode / local sync / SQLite queues (connectivity is reliable, always-online is assumed)
- Barcode / QR scanning
- Serial-number-wise cylinder tracking
- Attendance, leave, or advance-salary workflows
- Expense approval workflow (managers log expenses directly, no approval state)
- Receipt/photo capture for expenses
- Multi-branch / multi-location support
- Push notifications (not in current scope — flag if asked to add)

If a task seems to require any of the above, stop and ask rather than implementing it.

## Tech Stack

- **Monorepo**: Turborepo, npm/pnpm workspaces
- **Mobile**: React Native via Expo (managed workflow) — `apps/mobile`
- **Web**: React + TypeScript, owner-only — `apps/web`
- **Shared**: `packages/shared` — types, Supabase client, business logic (balance calc, category lists, formatters). Both apps import from here; do not duplicate logic between mobile and web.
- **Backend**: Supabase — PostgreSQL, Auth, auto-generated REST + Realtime API. No custom backend server.
- **Charts**: Recharts (web), Victory Native (mobile)
- **PDF generation**: server-side, via a Supabase Edge Function (for Invoice/DC/report documents)

## Data Model (summary — see TRD.md for full DDL)

`users`, `parties`, `transactions`, `stock`, `expenses`, `employees`

- `employees` is the only table restricted to the `owner` role via RLS.
- All other tables: both `owner` and `manager` have read access.
- Write access is narrower than "full" as of migration `0007` (security hardening):
  - `transactions` and `stock` are **read-only** to end users. All writes go through the
    `create_transaction` / `adjust_stock` functions.
  - `parties.balance` is not writable by anyone — it moves only via `create_transaction`.
  - `expenses` are editable/deletable only by whoever logged them (the owner keeps full
    access). Attribution is unenforceable otherwise. **This narrows the original
    "full read/write" rule** and is deliberate; see `0007` for the reasoning.
- `transactions.amount` (migration `0009`) is the rupee figure charged for a
  transaction, typed by hand on New Transaction.
- **There are two balances per party and they are not interchangeable.**
  `parties.balance` is a COUNT of cylinders held; `parties.amount_due` (migration `0010`) is
  RUPEES owed. Never render one where the other belongs. Both are derived columns moved only
  by `security definer` RPCs, and neither is in any client grant.
- `payments` (migration `0010`) records money received, against the **party**, not against an
  invoice. `amount_due = sum(transactions.amount) - sum(payments.amount)`. There is no
  allocation to specific invoices, no partial-invoice settlement, and no aging of money —
  the aging report stays about cylinders (PRD INV-4). Ask before adding any of those.
- A negative `amount_due` is valid and means the party is in credit (an advance or an
  overpayment). Read it through `src/lib/receivables.ts`, never raw — that module exists
  because rendering `-2500` under a heading that says "owes" tells the user to collect money
  from someone the business actually owes.
- `transactions.invoice_no` and `transactions.dc_no` come from two **independent** Postgres sequences (`invoice_no_seq`, `dc_no_seq`), generated server-side — never client-side, to avoid collisions from concurrent writes.

## Non-Negotiable Rules

1. **Payroll isolation is enforced by RLS, not the UI.** Any change touching the `employees` table must include/update an RLS policy and a test proving a `manager`-role query returns zero rows.
2. **Invoice/DC numbers are always server-generated**, via `nextval()` on their respective sequences inside a single atomic transaction alongside the stock/balance update. Never assign these numbers in client code. Since `0007` this is enforced by the database (no client INSERT grant on `transactions`), not just by convention — `tests/rls-write-paths.test.ts` proves it.
3. **New Transaction must be atomic**: transaction insert, party balance update, and stock quantity update happen together or not at all. `create_transaction` is `security definer` and is the only write path, so this is no longer skippable by calling PostgREST directly.
4. Don't add offline handling, scanning, approval workflows, or HR features "for completeness" — they're deliberately excluded (see Out of Scope above).

## Conventions

- TypeScript strict mode across all packages.
- Environment variables (Supabase URL/keys) via `.env`, never committed. `.env.example` should list required keys with placeholder values.
- Business logic (balance math, expense category list, dashboard aggregation) lives in `packages/shared`, imported by both apps — not reimplemented per-platform.
- Keep PRs/changes scoped to one phase at a time (see Current Phase below) rather than building ahead of it.

## Current Phase

**Phase 4** (done): PDF export for Invoice/DC via `expo-print`, OS share sheet for WhatsApp/SMS, and an error-surfacing polish pass. Full breakdown in PRD.md Section 8.

Done: Phase 1 (Home Dashboard, Party Ledger, New Transaction, Stock Summary), Phase 2 (Outstanding Report, Expense Dashboard, Add Expense, Expense List), Phase 3 mobile (Payroll Employee List + Summary, owner-only), Phase 4 (Invoice/DC PDF export + polish).

Also added outside the original phase plan: party creation (Add Party on the Party Ledger). The PRD has no story for it — INV-1…INV-6 all assume parties exist — so until Phase 4 the only way to create one was via the Supabase dashboard.

**Resolved since the last update:**
- Migration `0005_fix_role_claim.sql` and `0006_auth_admin_reads_roles.sql` are applied and the Custom Access Token Hook is enabled. `app_role` reaches the JWT and role-based policies evaluate correctly.
- **The payroll boundary is proven.** `npm run test:rls` is fully green (9/9), including the three owner-side controls that previously failed. The manager-denial assertions are now meaningful rather than vacuous.

**Security hardening pass (post-Phase 4):** migration `0007_write_path_hardening.sql`.
An audit found that Non-Negotiable Rules 2 and 3 held only because the client chose to
call the RPC — a signed-in manager could POST directly to PostgREST with a forged
`invoice_no`, misattribute the row via `created_by`, and skip the balance/stock update.
The trust boundary moved from the sign-in screen to the table:

- Direct writes to `transactions` / `stock` revoked; RPCs are `security definer` with
  their own role checks and pinned `search_path`.
- `created_by` stamped by a column DEFAULT, not sent by the client.
- `parties.balance` removed from the UPDATE grant.
- Quantity `CHECK` constraints; RPC validates before `nextval()` so failed writes no
  longer burn invoice numbers.
- Raw PostgREST errors no longer reach the UI — see `src/lib/errors.ts`.

Payroll RLS is unchanged. `tests/rls-write-paths.test.ts` covers the new boundaries and
runs under `npm run test:rls` alongside the payroll suite.

**Review follow-ups:** migration `0008_write_path_followups.sql` closes three gaps a
review found in `0007`:

- `create_transaction` now takes `FOR UPDATE` on the filled-stock row (concurrent callers
  could both pass the sufficiency check and both decrement) and rejects a missing stock
  row explicitly (`NULL < n` is `NULL`, so it fell through the guard).
- `parties` INSERT is now column-scoped like UPDATE already was — `balance` was still
  settable at creation time.
- User-facing RPC messages carry SQLSTATE `KX001` instead of relying on `P0001`, which is
  the default for *any* bare `raise exception` and so passed arbitrary internal text to
  the screen. `src/lib/errors.ts` keys on `KX001`; **apply `0008` before shipping a build
  with it.**

`toUserMessage` also takes `unknown` rather than `Error` — a thrown primitive used to
crash the handler that was supposed to contain it.

**Amount charged (post-Phase 4):** migration `0009_transaction_amount.sql` adds
`transactions.amount` — a manually-entered rupee figure per transaction, printed on both
the Invoice and the Delivery Challan. No PRD story called for it; it was requested directly.

- `create_transaction` gains a sixth parameter, `p_amount`, and the five-argument signature is
  **dropped**. Migration and app build are therefore a matched pair — **apply `0009` before
  shipping a build with it**, or every save fails with "function not found in the schema cache".
- `amount` gets no client grant, so an issued invoice's figure is not editable after the fact.
- **This reverses a Phase 4 decision**: the Delivery Challan used to carry no money at all
  ("a challan is not a bill"). It now prints the charged amount — and only that; no deposit,
  no outstanding balance. `documents.test.ts` pins both halves.
- Documents format money with `formatCurrencyExact` (always two decimals), not the whole-rupee
  `formatCurrency` the dashboards use — ₹1,250.50 printed as "₹1,251" is a wrong figure on paper.

**Receivables ledger (post-Phase 4):** migration `0010_receivables.sql` adds
`parties.amount_due` and the `payments` table. Requested directly; no PRD story covers it.

- **This reverses `0009`'s explicit "not a receivables ledger" decision.** `0009`'s header
  says the amount is recorded and never summed; `0010` sums it and is the later word. Both
  headers are left intact so the sequence is legible.
- What makes it a ledger rather than a running total is **payments**: charges alone only ever
  grow. `record_payment` and `delete_payment` are the write path; `payments` has no client
  INSERT/UPDATE/DELETE grant.
- Payments are **immutable** — there is no edit path. A mis-keyed figure is removed (which
  returns the money to `amount_due` in the same database transaction) and re-recorded.
  `delete_payment` is scoped to whoever recorded it, plus the owner — the same rule `0007`
  applied to expenses.
- `record_payment` takes `FOR UPDATE` on the party row. Two managers recording payments
  against one party without it is a lost update on money.
- The signature of `create_transaction` is unchanged by `0010`, so unlike `0009` it does not
  have to ship in lockstep with an app build.
- Ledger totals report money owed and money held as credit as **two separate figures**; they
  are never netted. See the comment in `src/lib/receivables.ts` for why.

**Still outstanding:**
- The owner web view (PRD GEN-3) was deliberately deferred — not built. This is the last unbuilt "Should" in the PRD.
- PDF export covers Invoice and Delivery Challan only (PRD INV-5). Stock-summary and report exports were considered in Phase 4 and left out — no PRD story calls for them. The Export button on the Stock screen says so rather than promising one.

## PDF Export

- Documents are defined in `src/lib/pdf/documents.ts` as pure HTML-string builders — no Expo or React imports, so they are unit-tested (`documents.test.ts`) and reusable by a future web client.
- Rendering and sharing live in `src/hooks/use-export-pdf.ts`, the only file that touches the device.
- **This deviates from SAD.md Section 7**, which originally specified a server-side Supabase Edge Function. The deviation and its rationale are recorded in SAD.md itself. If you add a second client, revisit that decision rather than duplicating the template.
- Invoice and DC numbers come from independent sequences and do not match. Never render one where the other belongs; `documents.test.ts` guards this.

## Testing

- `npm test` — unit tests (pure logic in `src/lib`). No database, no credentials.
- `npm run test:rls` — payroll RLS boundary **and** the write-path boundaries from `0007`,
  against a real Supabase project. Requires the `KHAATAX_TEST_*` credentials in
  `.env.example`. Fails loudly rather than skipping when they're absent, by design.
- These tests WRITE (probe rows in `employees`, `expenses`, `parties`), so they take their
  own `KHAATAX_TEST_SUPABASE_URL` and refuse to run against the project the app is pointed
  at unless `KHAATAX_TEST_ALLOW_SHARED_PROJECT=true`. Split the projects when you can.

Any change touching `employees` must re-run `test:rls` (Non-Negotiable Rule 1).

## When Unsure

Ask before assuming — especially around anything touching the owner/manager access boundary, the numbering sequences, or anything listed under Out of Scope.

@AGENTS.md