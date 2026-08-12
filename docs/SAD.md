# Software Architecture Document (v2)

## KhaataX — Owner + Manager Mobile & Web App

*Simplified scope: 2 roles, single location, no offline layer, no scanning*

| Field | Value |
|---|---|
| Document Version | 2.0 (Draft) |
| Supersedes | v1.0 — see Section 1.3 for what changed |
| Status | Draft — for review |

---

## Table of Contents

1. Introduction
2. Architectural Goals & Constraints
3. System Context
4. High-Level Architecture
5. Component Architecture
6. Data Architecture
7. Technology Stack
8. Security Architecture (Role Model & RLS)
9. Numbering & Sequence Design
10. Deployment Architecture
11. Non-Functional Requirements
12. Risks & Mitigations
13. Appendix: Glossary

---

## 1. Introduction

### 1.1 Purpose

This document defines the architecture for KhaataX v2 — a mobile and web application used exclusively by the business owner and 2-3 managers, covering Cylinder & Oxygen Inventory, a simplified Payroll list, and Expense Tracking.

### 1.2 Scope

Covers the React Native mobile app, the React web view, the Supabase backend, the data model, and the role-based security model. Does not cover UI wireframes (see the companion Mobile App Specification v2) or project timeline/budget.

### 1.3 What Changed From v1

| Area | v1 | v2 |
|---|---|---|
| Users | Owner, managers, field staff, HR, accountants | Owner + 2-3 fixed managers only |
| Connectivity | Offline-first, local sync queue | Always-online, no offline layer |
| Cylinder tracking | Serial-number-wise with barcode/QR scanning | Manual entry, no serial tracking |
| Payroll | Attendance, leave, advance salary, full HR module | Employee list + monthly pay only, Owner-only |
| Expenses | Approval workflow, receipt photo capture | Direct entry by Owner/Manager, no approval, no photos |
| Frontend | Flutter (mobile), optional React web | React Native (mobile) + React (web), shared TypeScript monorepo |
| Branches | Designed to extend to multi-branch | Single location only |

---

## 2. Architectural Goals & Constraints

### 2.1 Goals

- Small, tightly-scoped system for a 3-5 person user base — avoid over-engineering.
- Hard boundary between Owner and Manager on payroll data, enforced at the database layer.
- Fast, simple builds: no offline sync engine, no approval state machine, no scanning integration.
- Shared logic between mobile and web via a single TypeScript codebase.

### 2.2 Constraints

- Single warehouse/location — no multi-branch data partitioning needed.
- Fixed set of manager accounts, provisioned by the developer, not self-service.
- Cost-sensitive — small business, no dedicated DevOps team.

### 2.3 Key Architectural Drivers

| Driver | Architectural Response |
|---|---|
| Only 2 roles, but 1 hard boundary (payroll) | Row-Level Security on the employees table restricted to owner role; enforced server-side, not just hidden in UI |
| No offline/scanning needs | Removes an entire architectural layer present in v1 — simpler client, simpler backend |
| Small team, fast delivery | Supabase backend-as-a-service; React Native + React sharing one monorepo |
| Concurrent invoice/DC creation by owner + managers | Server-side atomic sequence generation (Postgres sequences), not client-generated numbers |

---

## 3. System Context

| Actor / System | Interaction |
|---|---|
| Owner | Full access via mobile app and web view: Inventory, Expenses, Payroll |
| Managers (2-3, fixed accounts) | Mobile app only: Inventory, Expenses. No Payroll access. |
| Parties (customers) | Not system users; receive invoices/DC as PDF, optionally via WhatsApp/SMS |
| PDF Export Engine | Generates invoice, DC, and report documents on demand |
| WhatsApp/SMS Gateway (optional) | Shares generated invoice/DC documents with parties |

---

## 4. High-Level Architecture

A simplified layered architecture: React Native and React clients share a TypeScript business-logic package, talk to Supabase's auto-generated API, which enforces authentication and Row-Level Security in front of a single PostgreSQL schema. There is no offline layer and no dedicated scanning/sync component — the biggest structural difference from v1.

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT LAYER                                                 │
│  ┌──────────────────────────┐   ┌──────────────────────────┐│
│  │ Mobile App                │   │ Web View                 ││
│  │ (React Native / Expo)     │   │ (React + TypeScript)     ││
│  │ Owner + Managers          │   │ Owner only                ││
│  └────────────┬──────────────┘   └────────────┬─────────────┘│
│               └──────────────┬─────────────────┘              │
│         Shared TypeScript package (monorepo):                 │
│         types, API client, business logic                     │
└──────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│ API / AUTH LAYER                                              │
│  Supabase Auto-generated REST + Realtime API                  │
│  Authentication (fixed owner/manager logins)                  │
│  Row-Level Security (RLS) enforced per role                   │
└───────────────────────────────┬─────────────────────────────┘
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ Inventory          │ │ Expenses           │ │ Payroll            │
│ parties,           │ │ amount, category,  │ │ employees,         │
│ transactions,       │ │ note               │ │ monthly_pay        │
│ stock               │ │ (Owner + Manager,  │ │ (Owner ONLY — RLS) │
│ (Owner + Manager)   │ │ no approval step)  │ │                    │
└──────────┬──────────┘ └──────────┬──────────┘ └──────────┬─────────┘
           └────────────────────────┼──────────────────────┘
                                     ▼
┌───────────────────────────────────────────────────────────────┐
│ DATA STORE                                                     │
│  PostgreSQL (managed by Supabase) — single schema,             │
│  RLS policies per table                                        │
└───────────────────────────────────┬─────────────────────────────┘
                                     ▼
┌───────────────────────────────────────────────────────────────┐
│ INTEGRATIONS (light)                                            │
│  PDF Export (Invoice/DC/Reports)   ·   WhatsApp/SMS (optional)  │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Component Architecture

### 5.1 Inventory Service (Owner + Manager)

- **Party Ledger** — customer-wise filled/empty/balance, Invoice & DC generation
- **Stock Manager** — filled/empty/under-refill/damaged counts, manually adjustable
- **Outstanding Engine** — computes overdue balances per party

### 5.2 Expense Service (Owner + Manager)

- **Expense Entry** — amount, category, note; written directly, no approval state
- **Reporting** — category breakdown, monthly trend, dashboard totals

### 5.3 Payroll Service (Owner only)

- **Employee Directory** — name, role, monthly pay
- **Payroll Summary** — total monthly payroll cost
- This is the only service with a role restriction enforced at the data layer — see Section 8.

### 5.4 Shared Platform Services

- **Auth** — Supabase Auth, two roles: `owner`, `manager`
- **Numbering Service** — atomic generation of next Invoice No. and next DC No.
- **Export Service** — PDF generation for invoices, DCs, and reports

---

## 6. Data Architecture

### 6.1 Core Entities

| Entity | Key Attributes | Access |
|---|---|---|
| Party | name, contact, security_deposit, balance | Owner + Manager |
| Transaction | party_id, date, invoice_no, dc_no, cylinder_type, filled_sent, empty_received | Owner + Manager |
| Stock | status (filled/empty/at_customer/under_refill/damaged), quantity | Owner + Manager |
| Expense | date, amount, category, note, created_by | Owner + Manager |
| Employee | name, role, monthly_pay | Owner ONLY (RLS-restricted) |
| User | auth_id, role ('owner' \| 'manager') | System-managed |

### 6.2 Data Store

A single PostgreSQL schema (managed by Supabase) holds all entities. There is no per-branch partitioning, since the business operates from one location. Row-Level Security policies — not separate databases or schemas — are what create the owner/manager boundary, keeping the data model simple while still enforcing the one access rule that matters.

---

## 7. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile Client | React Native (Expo) | No native offline/scanning modules needed, so Expo's managed workflow is a good fit; fast iteration |
| Web Client | React + TypeScript | Owner's laptop view; shares types/logic with mobile via monorepo |
| Shared Code | TypeScript monorepo (Turborepo/Nx) | One source of truth for types, API client, and business logic across mobile and web |
| Backend | Supabase (Postgres + Auto REST + Realtime) | Backend-as-a-service; avoids building custom auth/API for a 2-role system |
| Auth | Supabase Auth | Fixed owner/manager accounts, role claim used by RLS policies |
| Database | PostgreSQL | Relational integrity for balances, payroll totals, sequential numbering |
| Charts | Recharts (web), Victory Native (mobile) | Dashboard visualizations per platform |
| PDF Generation | Client-side (`expo-print`, HTML template in `src/lib/pdf/`) | Superseded the original server-side plan in Phase 4 — see note below |

> This stack intentionally omits several v1 components — no SQLite offline store, no barcode scanning library, no push-notification-driven approval flow, and no receipt image storage pipeline.

> **PDF generation — decision revised in Phase 4.** This row originally read
> "Server-side (Supabase Edge Function + PDF library)", justified as "consistent
> formatting regardless of client". That rationale assumed two clients. The owner
> web view (PRD GEN-3) was deferred and never built, leaving the Expo app as the
> only consumer, and an Edge Function would have added a deploy pipeline plus a
> server-side data path next to the payroll RLS boundary for no formatting gain.
>
> Invoice and Delivery Challan PDFs are therefore rendered on-device by
> `expo-print` from an HTML template, and handed to the OS share sheet by
> `expo-sharing`. The template lives in `src/lib/pdf/documents.ts` as pure,
> unit-tested string builders with no Expo or React dependency — so if GEN-3 is
> ever built, the web client reuses the same definition and the original goal of
> one layout is preserved without a server.
>
> Revisit this if a second client ships or if documents ever need to be generated
> without a signed-in device present (e.g. a scheduled email of statements).

---

## 8. Security Architecture (Role Model & RLS)

### 8.1 Roles

| Role | Inventory | Expenses | Payroll |
|---|---|---|---|
| owner | Read/Write | Read/Write | Read/Write |
| manager | Read/Write | Read/Write | No access (RLS denies at query level) |

### 8.2 Enforcement

- Row-Level Security policies on the `employees` table check the requesting user's role claim and return zero rows for `manager` — this is enforced by Postgres itself, so it holds even if a future API client bypasses the app UI entirely.
- Authentication via Supabase Auth; manager accounts are created once by the developer during setup, not self-service within the app.
- Web view uses the same Supabase project and RLS policies as mobile — no separate, weaker access path.

### 8.3 Data Protection

- Data encrypted in transit (TLS) and at rest (managed by Supabase).
- No receipt/photo storage in v2 — reduces the attack surface compared to v1's object storage requirement.

---

## 9. Numbering & Sequence Design

Invoice numbers and DC (Delivery Challan) numbers are two independent, globally-incrementing sequences — not per-party, and not shared with each other. A transaction can carry Invoice #201 and DC #145 simultaneously, generated from two separate Postgres sequences.

- `invoice_no_seq` — increments on invoice creation, global across all parties
- `dc_no_seq` — increments on DC creation, global across all parties, independent of `invoice_no_seq`
- Numbers are generated server-side (via a Postgres function or Edge Function) at write time, so concurrent transaction creation by the owner and a manager cannot produce duplicate or out-of-order numbers.

---

## 10. Deployment Architecture

- Backend: single Supabase project (no multi-region need at this scale).
- Mobile: distributed via Expo/EAS Build to Google Play and Apple App Store.
- Web: static React build deployed to a simple host (e.g. Vercel/Netlify), pointed at the same Supabase project.
- Environments: Development and Production Supabase projects — Staging is likely unnecessary at this scale but can be added later.
- Backups: automated daily Postgres backups (Supabase built-in).

---

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard loads in <2s on normal mobile data; simple queries given low data volume |
| Availability | Standard managed-service uptime; no offline fallback required per current scope |
| Security | Payroll access restricted at the database level, not just the UI |
| Usability | Core daily actions (new transaction, add expense) reachable in ≤2 taps from Home |
| Maintainability | Shared monorepo keeps mobile/web logic in sync; small enough scope for 1-2 developers to maintain |

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Future need for offline support (e.g. new location with poor connectivity) | Data model doesn't preclude adding a sync layer later; not built now to avoid premature complexity |
| Manual entry errors (no scanning/validation) | Simple input validation and confirmation screens on New Transaction; not a full solve, but appropriate for current manual-process trust level |
| Owner is a single point of failure for Payroll access | Acceptable per explicit requirement; documented here as a conscious trade-off, not an oversight |
| Growth beyond single location | RLS-based role model and Postgres schema can extend with a `location_id` dimension without a full redesign |

---

## 13. Appendix: Glossary

| Term | Definition |
|---|---|
| DC | Delivery Challan — document accompanying cylinders in transit |
| RLS | Row-Level Security — database-enforced access rules per row |
| Monorepo | Single repository containing multiple related packages/apps (mobile, web, shared code) |
| Expo | A managed framework/toolchain for React Native app development |
