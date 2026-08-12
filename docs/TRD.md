# Technical Requirements Document (TRD)

## KhaataX — Owner + Manager App

| Field | Value |
|---|---|
| Document Version | 1.0 |
| Status | Draft — for review |
| Related Documents | PRD.md, SAD.md, MOBILE_APP_SPEC.md |

---

## 1. Purpose

This document specifies the technical requirements needed to implement KhaataX as defined in the PRD: schema, API behavior, security enforcement, numbering logic, and non-functional targets. It assumes the architecture direction already set in the Software Architecture Document v2 (React Native + React, Supabase/PostgreSQL, RLS-based access control).

## 2. Technology Stack Requirements

| Layer | Requirement |
|---|---|
| Mobile client | React Native via Expo (managed workflow); iOS and Android from one codebase |
| Web client | React + TypeScript; owner-only, mirrors mobile functionality |
| Shared code | TypeScript monorepo (e.g. Turborepo or Nx) with a shared package for types, API client, and business logic used by both clients |
| Backend | Supabase: PostgreSQL, Auth, auto-generated REST + Realtime API |
| Database | PostgreSQL, single schema, no multi-tenant partitioning required |
| Charting | Recharts (web), Victory Native (mobile) — see note below |
| PDF generation | Server-side generation (Supabase Edge Function or equivalent) for Invoice/DC/report documents |

> **Charting deviation (Phase 2, decided during implementation).** The mobile
> Expense Dashboard charts are drawn with `react-native-svg`, which the app
> already depends on, rather than Victory Native. Victory Native requires
> `@shopify/react-native-skia`, a native module that would force a dev-client /
> EAS rebuild for two charts — a rolling 12-month bar trend and a ranked category
> breakdown — neither of which needs a charting engine. Revisit if a later phase
> needs interactive or composed charts. The web client's Recharts choice stands.

## 3. Data Model Requirements

The schema below is the minimum required to satisfy the PRD's functional requirements. Types are illustrative; exact PostgreSQL types to be finalized during implementation.

```sql
-- Users (mirrors Supabase auth.users, adds app role)
users (
  id            uuid primary key references auth.users,
  name          text not null,
  role          text not null check (role in ('owner','manager')),
  created_at    timestamptz default now()
)

-- Parties (customers)
parties (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact            text,
  security_deposit   numeric default 0,
  balance            numeric default 0,             -- derived/cached: CYLINDERS held (a count)
  amount_due         numeric(12,2) not null default 0, -- derived/cached: RUPEES owed (0010)
  created_at         timestamptz default now()
)

-- Payments received from a party (migration 0010). Recorded against the party,
-- not matched to an invoice. Immutable: no UPDATE path.
payments (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references parties(id),
  date         date not null default current_date,
  amount       numeric(12,2) not null check (amount > 0),
  method       text not null default 'cash'
               check (method in ('cash','upi','bank','cheque','other')),
  note         text,
  created_by   uuid not null references users(id) default auth.uid(),
  created_at   timestamptz default now()
)

-- Transactions (cylinder movement)
transactions (
  id               uuid primary key default gen_random_uuid(),
  party_id         uuid not null references parties(id),
  date             date not null default current_date,
  invoice_no       integer not null unique,
  dc_no            integer not null unique,
  cylinder_type    text not null,
  filled_sent      integer not null default 0,
  empty_received   integer not null default 0,
  amount           numeric(12,2) not null default 0,  -- charged; recorded, not accounted
  created_by       uuid not null references users(id),
  created_at       timestamptz default now()
)

-- Stock (single row per status)
stock (
  status      text primary key check (status in
              ('filled','empty','at_customer','under_refill','damaged')),
  quantity    integer not null default 0,
  updated_at  timestamptz default now()
)

-- Expenses
expenses (
  id           uuid primary key default gen_random_uuid(),
  date         date not null default current_date,
  amount       numeric not null check (amount > 0),
  category     text not null,
  note         text,
  created_by   uuid not null references users(id),
  created_at   timestamptz default now()
)

-- Employees (Payroll — Owner only)
employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text,
  monthly_pay   numeric not null check (monthly_pay >= 0),
  active        boolean default true,
  created_at    timestamptz default now()
)
```

## 4. Numbering & Sequence Requirements

Invoice numbers and DC numbers must be two independent, globally-incrementing, gap-tolerant sequences generated atomically at the database level to prevent collisions when the owner and a manager create transactions concurrently.

```sql
create sequence invoice_no_seq start 201;
create sequence dc_no_seq start 101;

-- Called server-side (e.g. in an Edge Function or a Postgres function)
-- at transaction-creation time:
select nextval('invoice_no_seq');   -- assigned to transactions.invoice_no
select nextval('dc_no_seq');        -- assigned to transactions.dc_no
```

- Numbers must never be generated client-side, to avoid duplicate/out-of-order numbers under concurrent use.
- Sequence values are never reused, even if a transaction is later edited or voided (requirement: confirm void/edit policy with product owner before implementation — see PRD Open Questions).

## 5. Access Control & Security Requirements

### 5.1 Roles

Exactly two application roles: `owner` and `manager`, stored on the `users` table and included in the Supabase Auth JWT as a custom claim used by RLS policies.

> **The claim is `app_role`, not `role`.** `role` is reserved by Supabase Auth for
> the Postgres role PostgREST assumes (`authenticated` / `anon`); the Custom Access
> Token Hook cannot overwrite it, and a successful overwrite would break PostgREST
> anyway by making it `SET ROLE owner`. An early implementation used `role` and the
> result was that `auth.jwt() ->> 'role'` stayed `authenticated`, so **every policy
> denied every user** — reads returned zero rows silently, writes failed with an RLS
> violation. Fixed in migration `0005`. Policies must test `auth.jwt() ->> 'app_role'`.

### 5.2 Row-Level Security Policies (required, by table)

| Table | Owner | Manager |
|---|---|---|
| users | SELECT | SELECT |
| parties | SELECT/INSERT/UPDATE/DELETE | SELECT/INSERT/UPDATE/DELETE |
| transactions | SELECT/INSERT/UPDATE/DELETE | SELECT/INSERT/UPDATE/DELETE |
| stock | SELECT/UPDATE | SELECT/UPDATE |
| expenses | SELECT/INSERT/UPDATE/DELETE | SELECT/INSERT/UPDATE/DELETE |
| employees | SELECT/INSERT/UPDATE/DELETE | No access (denied by policy) |

`users` is read-only to both roles and holds only id, name and role — it backs the
expense list's "logged by" column and filter (EXP-5). No compensation data lives
there; pay is in `employees`, which remains owner-only. Neither role may write to
`users`; accounts are provisioned by the developer (Section 5.3).

Example RLS policy required on `employees`:

```sql
alter table employees enable row level security;

create policy "owner_full_access"
  on employees
  for all
  using (auth.jwt() ->> 'role' = 'owner')
  with check (auth.jwt() ->> 'role' = 'owner');

-- No policy is defined for 'manager' — absence of a matching policy
-- means all access is denied by default under RLS.
```

### 5.3 Requirements

- RLS must be enabled on every table containing business data — no table should be left with default-open access.
- The `employees` table denial must be verified by direct API/query testing (not just confirmed absent from the UI) as part of QA sign-off.
- Manager accounts are created via Supabase Auth by the developer during setup; there is no in-app account creation flow for v1.
- All data in transit uses TLS; at-rest encryption is provided by the managed Postgres instance.

## 6. API Requirements

The app uses Supabase's auto-generated REST/Realtime API via the `supabase-js` client SDK, shared through the monorepo's common package. No custom backend API layer is required for CRUD operations; RLS is the sole enforcement mechanism for access control. Server-side logic is limited to:

- Sequence generation for `invoice_no` / `dc_no` (must be atomic, must not be exposed as a client-writable field)
- PDF generation for Invoice/DC/report documents
- Stock quantity recalculation on transaction insert (either via a Postgres trigger or an Edge Function — trigger is preferred for atomicity)

### 6.1 Required Server-Side Function: New Transaction

```
-- Conceptual flow, implemented as a Postgres function or Edge Function
-- triggered on transaction creation:

1. Validate party_id exists
2. invoice_no := nextval('invoice_no_seq')
3. dc_no := nextval('dc_no_seq')
4. Insert into transactions (...)
5. Update parties.balance for party_id
6. Update stock quantities (filled -= filled_sent, at_customer += filled_sent,
   empty += empty_received, at_customer -= empty_received)
7. Return created transaction with assigned invoice_no / dc_no
```

This must run as a single atomic operation (database transaction) so a failure partway through cannot leave stock, party balance, and transaction records inconsistent.

`transactions.amount` (migration `0009`) rides along in step 4: it is validated (non-null, non-negative, rounded to two places) before step 2, then stored and printed on both the Invoice and the Delivery Challan.

Since migration `0010` it also feeds step 5, which now moves **two** columns in one statement: `parties.balance` (cylinders held, a count) and `parties.amount_due` (rupees owed). They are separate quantities and must never be rendered in place of each other.

### 6.2 Required Server-Side Function: Record Payment

```
1. Authorise (owner or manager)
2. Validate: amount present, > 0 after rounding to 2 places; date present;
   method in (cash, upi, bank, cheque, other)
3. Lock the party row (FOR UPDATE) — concurrent payments against one party
   would otherwise lose an update on money
4. Insert into payments (...)
5. parties.amount_due -= amount
```

Atomic, for the same reason as 6.1: a payment row without the balance move, or the reverse, leaves the cached column disagreeing with its own source data and nothing detects it. `delete_payment` is the mirror image (delete the row, add the amount back) and exists because payments have no UPDATE path — a wrong entry is removed and re-recorded rather than silently edited.

The invariant, and the query to reconcile with:

```sql
amount_due = coalesce(sum(transactions.amount), 0) - coalesce(sum(payments.amount), 0)
```

`amount_due` is deliberately unconstrained in sign: negative means the party is in credit (an advance or an overpayment), which is an ordinary state, not a data error.

## 7. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Dashboard and list screen load time | < 2 seconds on typical mobile data |
| Performance | New transaction / add expense save time | < 1 second |
| Scalability | Expected data volume | Low: single location, 2-4 concurrent users, thousands of transactions/year — no special scaling design required |
| Availability | Backend uptime | Standard managed Supabase SLA; no offline fallback required |
| Security | Payroll data isolation | Verified by direct RLS testing, not UI inspection alone |
| Auditability | `created_by` tracked on transactions and expenses | Every write attributable to a user |
| Backup | Automated daily database backups | Point-in-time recovery available given financial data |
| Maintainability | Shared monorepo code coverage between mobile/web | Business logic (balance calc, category lists, etc.) defined once, imported by both clients |

## 8. Environment & Deployment Requirements

- Two Supabase projects: Development and Production. Staging is optional given team/data size, may be added later.
- Mobile builds via Expo Application Services (EAS Build), distributed through Google Play and Apple App Store.
- Web client deployed as a static build (e.g. Vercel or Netlify), configured against the Production Supabase project.
- Environment variables (Supabase URL/keys) must be managed per environment and never committed to source control.

## 9. Testing Requirements

| Test Type | Coverage Required |
|---|---|
| Unit tests | Balance calculation logic, stock recalculation logic, category aggregation for dashboards |
| RLS / security tests | Automated test confirming a manager-role query against `employees` returns zero rows; confirming owner-role queries succeed on all tables |
| Integration tests | Concurrent transaction creation does not produce duplicate or out-of-order `invoice_no`/`dc_no` values |
| Manual QA | Full screen-by-screen pass for both Owner and Manager roles, confirming Payroll is fully absent (UI and network requests) for Manager |
| Regression | Re-run RLS and numbering tests on every schema migration |

Implemented as of Phase 3: `npm test` runs the unit suites (aging/FIFO, date
boundaries, payroll aggregation); `npm run test:rls` runs the `employees`
boundary test in `tests/rls-employees.test.ts` against a live project. The
concurrency test for `invoice_no`/`dc_no` is **not yet written**.

## 10. Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A future RLS policy change accidentally exposes `employees` to manager role | RLS policy changes require explicit test coverage (Section 9) before merge; treat as a security-sensitive change requiring review |
| Client-side invoice/DC number generation introduced by mistake during development | Numbering must only ever be assigned server-side; enforce via database default/trigger, not application code discipline alone |
| Stock/balance drift from partial failures during transaction writes | New Transaction flow must be a single atomic database transaction (Section 6.1) |
| Manager account credentials shared/reused informally | Out of scope for the app to prevent; document as an operational risk for the business owner |

## 11. Glossary

| Term | Definition |
|---|---|
| RLS | Row-Level Security — PostgreSQL feature restricting query results per row based on the requesting user |
| DC | Delivery Challan — document accompanying cylinders in transit |
| JWT | JSON Web Token — used by Supabase Auth to carry the user's role claim |
| Edge Function | Supabase's serverless function offering, used here for numbering and PDF generation |
