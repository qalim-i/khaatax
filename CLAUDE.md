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

**Phase 3** (next): Payroll (Employee List + Summary) and the owner-only web view.

Done: Phase 1 (Home Dashboard, Party Ledger, New Transaction, Stock Summary) and Phase 2 (Outstanding Report, Expense Dashboard, Add Expense, Expense List).

Remaining after Phase 3: PDF export for Invoice/DC/reports, polish (Phase 4). Full breakdown in PRD.md Section 8.

Phase 3 is the first phase to touch `employees` — re-read Non-Negotiable Rule 1 before starting it.

## When Unsure

Ask before assuming — especially around anything touching the owner/manager access boundary, the numbering sequences, or anything listed under Out of Scope.

@AGENTS.md