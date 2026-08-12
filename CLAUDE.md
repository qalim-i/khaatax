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
- All other tables: both `owner` and `manager` have full read/write.
- `transactions.invoice_no` and `transactions.dc_no` come from two **independent** Postgres sequences (`invoice_no_seq`, `dc_no_seq`), generated server-side — never client-side, to avoid collisions from concurrent writes.

## Non-Negotiable Rules

1. **Payroll isolation is enforced by RLS, not the UI.** Any change touching the `employees` table must include/update an RLS policy and a test proving a `manager`-role query returns zero rows.
2. **Invoice/DC numbers are always server-generated**, via `nextval()` on their respective sequences inside a single atomic transaction alongside the stock/balance update. Never assign these numbers in client code.
3. **New Transaction must be atomic**: transaction insert, party balance update, and stock quantity update happen together or not at all.
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
- `npm run test:rls` — payroll RLS boundary against a real Supabase project. Requires the `KHAATAX_TEST_*` credentials in `.env.example`. Fails loudly rather than skipping when they're absent, by design.

Any change touching `employees` must re-run `test:rls` (Non-Negotiable Rule 1).

## When Unsure

Ask before assuming — especially around anything touching the owner/manager access boundary, the numbering sequences, or anything listed under Out of Scope.

@AGENTS.md