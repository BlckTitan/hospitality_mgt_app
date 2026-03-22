# Product Requirements Document
## Bar Management System — Convex Edition

| Field         | Detail                          |
|---------------|---------------------------------|
| Version       | 2.0                             |
| Status        | Draft                           |
| Database      | Convex                          |
| Date          | 2026-03-22                      |
| Prepared by   | Product Team                    |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Objectives](#2-goals-and-objectives)
3. [Stakeholders and User Roles](#3-stakeholders-and-user-roles)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 [User Management](#41-user-management)
   - 4.2 [Shift and Stock Tracking — Waiter View](#42-shift-and-stock-tracking--waiter-view)
   - 4.3 [Bar Inventory Management — Store Manager View](#43-bar-inventory-management--store-manager-view)
   - 4.4 [Sales and Performance Analytics — Business Owner View](#44-sales-and-performance-analytics--business-owner-view)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Convex Architecture and Data Model](#6-convex-architecture-and-data-model)
7. [Business Rules](#7-business-rules)
8. [Reporting Requirements](#8-reporting-requirements)
9. [Convex Function Index](#9-convex-function-index)
10. [Assumptions and Constraints](#10-assumptions-and-constraints)
11. [Out of Scope](#11-out-of-scope)
12. [Glossary](#12-glossary)

---

## 1. Executive Summary

The **Bar Management System** is a real-time operations platform built on
**Convex** that digitises and centralises stock tracking, inventory management,
and sales reporting across multiple bar outlets within a single hospitality
premises.

Convex is chosen as the backend for its real-time reactive data model,
TypeScript-first schema enforcement, built-in scheduling (cron jobs), and
transactional mutations — all of which map naturally to the system's core
requirements: live inventory dashboards, immediate reorder alerts, consistent
stock reconciliation, and pre-aggregated reporting.

The system serves three user personas — **waiters/bar staff**, **bar/store
managers**, and **business owners** — through a unified Convex backend that
provides end-to-end type safety, live query subscriptions, and serverless
function execution.

---

## 2. Goals and Objectives

**Primary Goals**

- Enable bar staff to record and reconcile daily stock movements and sales with
  real-time feedback via Convex reactive queries.
- Give store managers live visibility into beverage inventory via subscribed
  Convex queries, with automatic reorder alerts triggered by Convex mutations.
- Provide business owners with multi-dimensional performance dashboards powered
  by pre-aggregated `salesSummaries` documents, updated by Convex scheduled
  mutations (cron jobs).

**Success Metrics**

- Zero unreconciled stock discrepancies at end-of-shift, enforced by
  `userStockLogs` mutation validation.
- Reorder alerts created within one transaction of the stock falling below
  threshold.
- All analytics views load in under two seconds using indexed Convex queries
  against `salesSummaries`.
- No manual data compilation required for any business owner report.

---

## 3. Stakeholders and User Roles

### 3.1 Business Owner / Administrator

Full visibility across all bars, beverages, and staff. Does not manage day-to-day
stock but requires comprehensive reporting.

**Key concerns:** revenue trends, best-performing staff, underperforming
beverages, year-on-year comparisons, cross-bar comparisons.

**Convex access pattern:** Read-only queries against `salesSummaries` using
compound indexes. No mutations required.

### 3.2 Bar / Store Manager

Manages the central store inventory and oversees stock distribution to bars.
Responsible for procurement decisions and reorder management.

**Key concerns:** current inventory levels, stock issued vs. stock on hand,
reorder alerts, beverage replenishment.

**Convex access pattern:** Subscribed queries on `storeInventory` and
`reorderAlerts`. Mutations on `storeTransactions` and `reorderAlerts`.

### 3.3 Waiter / Bar Staff

Assigned to a specific bar per shift. Records stock received and reconciles
closing stock at end of shift.

**Key concerns:** opening stock, additional stock collected, sales made,
closing stock balance.

**Convex access pattern:** Queries on `shifts` and `userStockLogs` scoped to
their own `userId`. Mutations to create and update `userStockLogs`.

### 3.4 Convex Scheduler (System)

Automated background jobs running as Convex cron mutations. Responsible for
aggregating `userStockLogs` into `salesSummaries` on daily, weekly, monthly,
and yearly schedules.

---

## 4. Functional Requirements

### 4.1 User Management

**FR-USR-001** — The system shall maintain a `users` table in Convex with the
following fields: `externalId`, `email`, `name`, `phone` (optional),
`isActive`, `lastLoginAt` (optional), `updatedAt`. The `_id` and
`_creationTime` fields are provided automatically by Convex.

**FR-USR-002** — The `users` table shall define a `by_externalId` index on
`[externalId]` to enable O(log n) auth lookups on every login event.

**FR-USR-003** — The system shall support Single Sign-On (SSO) via an external
authentication provider. On first login, a Convex mutation shall create a `users`
document seeded from the provider's token claims. On subsequent logins, the
mutation shall update `lastLoginAt` using `Date.now()`.

**FR-USR-004** — A `by_email` index shall exist on the `users` table to enforce
email uniqueness at the application layer within the mutation that creates users.

**FR-USR-005** — Inactive users (`isActive: false`) shall be blocked at the
auth layer. All Convex queries and mutations that reference user identity shall
validate `isActive` before proceeding.

---

### 4.2 Shift and Stock Tracking — Waiter View

**FR-SHF-001** — A Convex mutation shall create a `shifts` document when a
waiter begins a working session, recording `userId`, `barId`, `shiftDate`
(ISO 8601 string), `startTime`, and setting `isFinalized: false`.

**FR-SHF-002** — For each beverage in the shift, a Convex mutation shall create
or update a `userStockLogs` document containing:

| Field              | Source                                         |
|--------------------|------------------------------------------------|
| `openingStock`     | Manual entry or previous shift's `closingStock`|
| `newStockReceived` | Manual entry; triggers a `storeTransactions` issue |
| `totalStock`       | Computed in mutation: `openingStock + newStockReceived` |
| `closingStock`     | Manual entry at end of shift                   |
| `salesQuantity`    | Computed in mutation: `totalStock − closingStock` |
| `salesValue`       | Computed in mutation: `salesQuantity × beverage.unitPrice` |
| `recordedAt`       | `Date.now()` at time of mutation               |

> Derived fields are persisted in the document (not computed at query time) to
> avoid cross-document reads in Convex query functions.

**FR-SHF-003** — The mutation creating or updating a `userStockLogs` document
shall validate that `closingStock <= totalStock`. If the check fails, the
mutation shall throw a `ConvexError` and the document shall not be written.

**FR-SHF-004** — A `by_shiftId` index on `userStockLogs` shall enable the
waiter's shift summary view to load all beverage logs for their current shift
in a single indexed query.

**FR-SHF-005** — When a waiter finalises their shift, a mutation shall set
`isFinalized: true` on the `shifts` document. Subsequent mutation attempts to
modify `userStockLogs` entries for that shift shall be rejected unless the
caller has a manager or administrator role.

**FR-SHF-006** — The opening stock for a new shift shall be pre-filled by
querying the most recent `userStockLogs` document for the same `beverageId` at
the same `barId`, filtered by a finalised shift, ordered by `_creationTime`
descending.

---

### 4.3 Bar Inventory Management — Store Manager View

**FR-INV-001** — The system shall maintain one `storeInventory` document per
beverage. The `by_beverageId` index on this table shall be used to retrieve or
upsert a beverage's inventory record within a single indexed query.

**FR-INV-002** — When new supplier stock arrives, a Convex mutation shall:
1. Insert a `storeTransactions` document with `txnType: "receive"`.
2. Increment `qtyInStore` on the corresponding `storeInventory` document.
3. Update `lastUpdated` to `Date.now()`.

All three writes shall occur within the same Convex mutation to guarantee atomicity.

**FR-INV-003** — When a user collects stock from the store, a Convex mutation
shall:
1. Insert a `storeTransactions` document with `txnType: "issue"`, including the
   `barId` and `userId`.
2. Decrement `qtyInStore` on the corresponding `storeInventory` document.
3. Check if `qtyInStore` has fallen to or below `reorderThreshold`. If so, and
   if no `reorderAlerts` document with `status: "open"` exists for that
   `beverageId` (checked via `by_beverageId_status` index), insert a new
   `reorderAlerts` document.

All writes shall occur within the same Convex mutation.

**FR-INV-004** — The store manager's inventory dashboard shall use a subscribed
Convex query on `storeInventory` joined with `beverages` documents, providing
real-time updates whenever any inventory document changes.

**FR-INV-005** — A subscribed Convex query on `reorderAlerts` filtered by
`by_status` index with `status: "open"` shall power the live alert panel for
the store manager.

**FR-INV-006** — Convex mutations shall allow the store manager to transition
a `reorderAlerts` document through its lifecycle: `"open"` → `"acknowledged"`
→ `"resolved"`. No backward transitions shall be permitted; the mutation shall
throw if a reverse transition is attempted.

---

### 4.4 Sales and Performance Analytics — Business Owner View

**FR-ANA-001** — A Convex cron job shall run daily (e.g. at 01:00) to aggregate
all finalised `userStockLogs` documents from the preceding day into
`salesSummaries` documents with `periodType: "daily"`. Weekly, monthly, and
yearly summaries shall be rolled up from daily records on their respective
schedule boundaries.

**FR-ANA-002** — Sales performance per user shall be retrieved by querying
`salesSummaries` using the `by_userId_period` index, filtered by the desired
`periodType` and `periodKey`, then sorted by `totalRevenue` descending.

**FR-ANA-003** — Bar-level comparison shall be retrieved by querying
`salesSummaries` with the `by_barId_period` index for each of the three bars in
parallel using `Promise.all`, then merging results client-side.

**FR-ANA-004** — Beverage performance trends shall be retrieved by querying
`salesSummaries` with the `by_beverageId_period` index, providing time-series
data for any beverage across any period granularity.

**FR-ANA-005** — Year-on-year comparison shall query `salesSummaries` using the
`by_year_periodType` index for two calendar years with matching `periodType` and
`periodKey` patterns, enabling same-period comparisons across years.

**FR-ANA-006** — The user leaderboard shall query `salesSummaries` by
`by_barId_period`, group by `userId`, sum `totalRevenue`, and return the top N
users sorted by revenue. This logic shall live in a Convex query function, not
client-side.

**FR-ANA-007** — All analytics queries shall accept `barId`, `beverageId`,
`userId`, `periodType`, and `periodKey` as optional filter arguments, validated
using Convex argument validators (`v.optional(v.id(...))`, etc.).

---

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-PERF-001** — All Convex query functions used in dashboards shall target
execution under 100ms by relying exclusively on indexed lookups — no full table
scans via `.collect()` on large tables.

**NFR-PERF-002** — `salesSummaries` aggregation shall be performed in scheduled
Convex mutations (cron), not in user-facing query functions, to ensure read
latency stays constant regardless of historical data volume.

**NFR-PERF-003** — For large aggregation jobs (e.g. yearly rollups), the Convex
mutation shall paginate over `userStockLogs` using `.paginate()` rather than
`.collect()` to stay within Convex's document read limits per transaction.

### 5.2 Real-Time

**NFR-RT-001** — The store manager's inventory dashboard and reorder alert panel
shall use Convex reactive queries (`useQuery` on the client) so that any
inventory change is reflected in the UI without polling.

**NFR-RT-002** — Waiter stock log changes shall be reflected in real-time for
any manager viewing the same shift's progress.

### 5.3 Security

**NFR-SEC-001** — All Convex query and mutation functions shall validate the
caller's identity via `ctx.auth.getUserIdentity()`. Functions shall throw if the
identity is absent or if the user's role does not permit the action.

**NFR-SEC-002** — The `users` table `externalId` shall be the sole bridge
between the external auth provider and Convex documents. JWT tokens shall never
be stored in Convex.

**NFR-SEC-003** — Row-level scoping shall be enforced in Convex functions: waiter
queries shall always filter by the caller's `userId` to prevent cross-user data
access.

**NFR-SEC-004** — Convex environment variables shall store all secrets (e.g.
auth provider keys). No secrets shall appear in schema or function source code.

### 5.4 Reliability

**NFR-REL-001** — All multi-step stock operations (issue stock + update inventory
+ check reorder) shall occur within a single Convex mutation, leveraging
Convex's serialisable transaction guarantees to prevent partial writes.

**NFR-REL-002** — The cron job for `salesSummaries` aggregation shall be
idempotent — re-running it for the same period shall update existing summary
documents rather than creating duplicates. A compound lookup using
`by_barId_beverage_period` shall detect existing records before inserting.

### 5.5 Scalability

**NFR-SCA-001** — The schema design shall support the addition of new bars,
beverages, and users without schema migrations. New `bars` and `beverages`
documents can be inserted at runtime.

**NFR-SCA-002** — Indexes are defined at schema time. Any new reporting dimension
that requires a new index shall be introduced via a schema update and a
`npx convex deploy`.

---

## 6. Convex Architecture and Data Model

### 6.1 Tables

| Convex Table        | Role                                                         |
|---------------------|--------------------------------------------------------------|
| `bars`              | Physical bar outlets                                         |
| `beverages`         | Drink products                                               |
| `users`             | All platform users (waiters, managers, admins)               |
| `shifts`            | Working sessions per user per bar                            |
| `userStockLogs`     | Per-shift, per-beverage stock and sales reconciliation       |
| `storeInventory`    | Live central store balance per beverage (1:1 with beverages) |
| `storeTransactions` | Audit log of all stock movements                             |
| `reorderAlerts`     | System-generated low-stock notifications                     |
| `salesSummaries`    | Pre-aggregated sales data for reporting                      |

### 6.2 System Fields

Convex automatically adds the following to every document:

| Field            | Type     | Description                            |
|------------------|----------|----------------------------------------|
| `_id`            | `Id<T>`  | Globally unique document identifier    |
| `_creationTime`  | `number` | Epoch ms timestamp at document creation|

These fields are never declared in `convex/schema.ts`.

### 6.3 Timestamp Convention

All application-managed timestamps (e.g. `lastLoginAt`, `recordedAt`,
`lastUpdated`, `txnDate`, `alertedAt`) are stored as `number` (milliseconds
since epoch via `Date.now()`). Calendar dates (e.g. `shiftDate`) and clock times
(e.g. `startTime`, `endTime`) are stored as ISO 8601 strings to preserve
timezone-independent semantics.

### 6.4 Aggregation Strategy

Convex enforces limits on documents read per transaction. The `salesSummaries`
table exists to pre-aggregate data so that reporting queries remain O(1) against
indexes rather than O(n) table scans. The cron-based aggregation pipeline is:

```
Finalised shifts → userStockLogs (daily) → salesSummaries (daily)
                                         → salesSummaries (weekly)   [Monday cron]
                                         → salesSummaries (monthly)  [1st of month cron]
                                         → salesSummaries (yearly)   [1st Jan cron]
```

### 6.5 Referential Integrity

Convex does not enforce foreign key constraints at the database level.
Referential integrity is the responsibility of mutation functions:

- Before inserting a `shifts` document, the mutation validates that the
  referenced `userId` and `barId` documents exist and are active.
- Before inserting a `userStockLogs` document, the mutation validates the
  `shiftId` and `beverageId`.
- Deletion of `bars` or `beverages` documents is blocked by mutation logic if
  related documents exist.

---

## 7. Business Rules

**BR-001** — Each bar must have at least one active user assigned before a shift
can be created. The shift creation mutation shall verify this.

**BR-002** — A user may work at most one active (non-finalised) shift per bar at
any given time. The mutation shall query `by_userId_date` before inserting a
new shift.

**BR-003** — Every `newStockReceived` entry in `userStockLogs` must be backed by
a corresponding `storeTransactions` issue record. The mutation that updates
`newStockReceived` shall atomically create the transaction and decrement store
inventory.

**BR-004** — A `reorderAlerts` document of status `"open"` shall be created at
most once per beverage. The mutation shall check `by_beverageId_status` before
inserting a new alert.

**BR-005** — `salesQuantity` shall never be negative. A negative computed value
shall cause the mutation to throw a `ConvexError`, preventing the document write.

**BR-006** — `salesSummaries` aggregation shall only process `userStockLogs`
documents belonging to shifts where `isFinalized: true`.

**BR-007** — A beverage with `isActive: false` shall not appear in new shift
stock log templates. The query that returns available beverages for a shift shall
filter using the `by_isActive` index.

**BR-008** — `salesSummaries` upsert logic shall use `periodKey` + `barId` +
`beverageId` + `userId` + `periodType` as the natural composite key to detect
duplicates. An existing record shall be patched (`ctx.db.patch`), not replaced,
to preserve `_creationTime`.

---

## 8. Reporting Requirements

| Report Name                 | Convex Index Used                         | Audience       | Period Granularity            |
|-----------------------------|-------------------------------------------|----------------|-------------------------------|
| Daily shift reconciliation  | `by_shiftId` on `userStockLogs`           | Waiter         | Per shift                     |
| Inventory status            | `by_beverageId` on `storeInventory`       | Store Manager  | Real-time (subscribed)        |
| Stock movement log          | `by_beverageId_date` on `storeTransactions` | Store Manager | Date range, on demand         |
| Open reorder alerts         | `by_status` on `reorderAlerts`            | Store Manager  | Real-time (subscribed)        |
| Sales by user               | `by_userId_period` on `salesSummaries`    | Business Owner | Daily / Weekly / Monthly / Yearly |
| Sales by bar                | `by_barId_period` on `salesSummaries`     | Business Owner | Daily / Weekly / Monthly / Yearly |
| Beverage performance trend  | `by_beverageId_period` on `salesSummaries`| Business Owner | Any granularity               |
| Year-on-year comparison     | `by_year_periodType` on `salesSummaries`  | Business Owner | Same period, two years        |
| Top performer leaderboard   | `by_barId_period` → group by userId       | Business Owner | Configurable                  |
| Cross-bar comparison        | `by_barId_period` × 3 bars (parallel)     | Business Owner | Configurable                  |

---

## 9. Convex Function Index

The following Convex functions shall be implemented. All files reside in the
`convex/` directory.

### Queries (`query`)

| Function                         | File                    | Description                                      |
|----------------------------------|-------------------------|--------------------------------------------------|
| `getActiveBars`                  | `convex/bars.ts`        | Returns all bars with `isActive: true`           |
| `getActiveBeverages`             | `convex/beverages.ts`   | Returns beverages filtered by `isActive`         |
| `getShiftStockLogs`              | `convex/stockLogs.ts`   | Returns `userStockLogs` for a given `shiftId`    |
| `getUserShifts`                  | `convex/shifts.ts`      | Returns shifts for the authenticated user        |
| `getStoreInventory`              | `convex/inventory.ts`   | Returns all `storeInventory` docs with beverages |
| `getOpenReorderAlerts`           | `convex/alerts.ts`      | Returns alerts with `status: "open"`             |
| `getSalesByUserPeriod`           | `convex/analytics.ts`   | Queries `salesSummaries` by user and period      |
| `getSalesByBarPeriod`            | `convex/analytics.ts`   | Queries `salesSummaries` by bar and period       |
| `getBeverageTrend`               | `convex/analytics.ts`   | Queries `salesSummaries` by beverage and period  |
| `getYearOnYearComparison`        | `convex/analytics.ts`   | Compares same period across two years            |
| `getUserLeaderboard`             | `convex/analytics.ts`   | Returns top N users by revenue for a period      |

### Mutations (`mutation`)

| Function                         | File                    | Description                                              |
|----------------------------------|-------------------------|----------------------------------------------------------|
| `upsertUserFromSSO`              | `convex/users.ts`       | Creates or updates a user on SSO login                   |
| `createShift`                    | `convex/shifts.ts`      | Opens a new shift for a user at a bar                    |
| `finalizeShift`                  | `convex/shifts.ts`      | Sets `isFinalized: true` on a shift                      |
| `saveStockLog`                   | `convex/stockLogs.ts`   | Upserts a `userStockLogs` entry with validation          |
| `receiveStock`                   | `convex/inventory.ts`   | Records a supplier delivery; increments `storeInventory` |
| `issueStock`                     | `convex/inventory.ts`   | Issues stock to a bar/user; decrements inventory; may create alert |
| `acknowledgeReorderAlert`        | `convex/alerts.ts`      | Transitions alert to `"acknowledged"`                    |
| `resolveReorderAlert`            | `convex/alerts.ts`      | Transitions alert to `"resolved"`                        |

### Scheduled Mutations (`internalMutation` + `cron`)

| Function                         | File                    | Schedule          | Description                                   |
|----------------------------------|-------------------------|-------------------|-----------------------------------------------|
| `aggregateDailySummaries`        | `convex/cron.ts`        | Daily at 01:00    | Rolls up finalised shifts into daily summaries|
| `aggregateWeeklySummaries`       | `convex/cron.ts`        | Monday at 02:00   | Rolls daily → weekly summaries                |
| `aggregateMonthlySummaries`      | `convex/cron.ts`        | 1st of month 03:00| Rolls daily → monthly summaries               |
| `aggregateYearlySummaries`       | `convex/cron.ts`        | 1st Jan 04:00     | Rolls monthly → yearly summaries              |

---

## 10. Assumptions and Constraints

- The premises operates exactly three bars. The data model supports more, but
  the initial deployment is scoped to three.
- Each waiter works at one bar per shift. Multi-bar shifts are out of scope for v1.
- Beverage pricing is fixed per unit at the time of stock log creation. Dynamic
  pricing is out of scope.
- The system does not process payments or customer-facing orders. It tracks stock
  and sales volumes only.
- All monetary values are stored in a single currency (`v.number()`); no currency
  code field is required for v1.
- SSO is provided by an external identity provider (e.g. Clerk, Auth0) integrated
  via Convex's Auth adapter. Convex itself does not store passwords.
- Convex's document read limits per transaction apply. Aggregation jobs shall
  use `.paginate()` for large datasets.
- The `salesSummaries` table is append/upsert only. Historical summary records
  are never deleted.

---

## 11. Out of Scope

The following are explicitly excluded from v1:

- Customer-facing ordering or point-of-sale functionality
- Integration with external accounting software (QuickBooks, Sage, etc.)
- Supplier management or purchase order workflows
- Multi-currency or multi-tax-jurisdiction support
- Native mobile apps (iOS/Android); mobile-responsive web is sufficient
- Real-time sync between bars at the physical/hardware level
- HR or payroll integration
- Convex file storage usage (no receipt images or documents in v1)
- Full-text search on beverage names (Convex Search is available but out of scope)

---

## 12. Glossary

| Term                  | Definition                                                                                                    |
|-----------------------|---------------------------------------------------------------------------------------------------------------|
| `_id`                 | Convex auto-generated unique document identifier of type `Id<"tableName">`.                                   |
| `_creationTime`       | Convex auto-generated epoch ms timestamp added to every document.                                             |
| Bar                   | A physical outlet within the premises where beverages are sold.                                               |
| Beverage              | Any drink product tracked by the system.                                                                      |
| Closing Stock         | Physical count of unsold units remaining at end of a shift.                                                   |
| Convex Cron           | A scheduled Convex mutation defined in `convex/crons.ts` using `crons.daily(...)` or similar helpers.         |
| Convex Index          | A `.index("name", ["field"])` declaration on a table used for O(log n) filtered queries.                      |
| Convex Mutation       | A Convex server function that reads and writes data atomically within a serialisable transaction.             |
| Convex Query          | A Convex server function that reads data reactively; clients subscribe and receive live updates.               |
| `Date.now()`          | The standard way to record the current epoch ms timestamp within a Convex mutation.                           |
| Issue                 | A `storeTransactions` record with `txnType: "issue"` — stock moved from store to a bar/user.                  |
| Opening Stock         | Units a user starts with at the beginning of a shift.                                                         |
| `periodKey`           | A string encoding the summary period: `"YYYY-MM-DD"` (daily), `"YYYY-WNN"` (weekly), etc.                    |
| Receive               | A `storeTransactions` record with `txnType: "receive"` — stock received from a supplier.                      |
| Reorder Alert         | A `reorderAlerts` document created when a beverage's `qtyInStore` falls to or below `reorderThreshold`.       |
| Sales Quantity        | `totalStock − closingStock`; units sold during a shift. Persisted in `userStockLogs`.                         |
| Sales Summary         | A pre-aggregated `salesSummaries` document covering a bar, user, beverage, and time period.                   |
| Shift                 | A working session, represented as a `shifts` document, assigned to one user at one bar.                       |
| SSO                   | Single Sign-On. Users authenticate via an external provider; `externalId` links the provider identity to Convex. |
| Store Inventory       | The `storeInventory` table; one document per beverage holding the live central store balance.                  |
| Total Stock           | `openingStock + newStockReceived`; total available to a user during a shift. Persisted in `userStockLogs`.    |
| User                  | Any platform user — waiter, manager, or administrator — represented as a `users` document.                    |
| `v.id("table")`       | Convex's typed foreign key validator referencing a document in the named table.                               |
| `v.optional(...)`     | Convex validator wrapper indicating a field may be absent (equivalent to TypeScript `field?: T`).             |
