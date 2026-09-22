# Product Requirements Document
## Bar Management System — Convex Edition

| Field         | Detail                          |
|---------------|---------------------------------|
| Version       | 2.2                             |
| Status        | Implemented (hub + stock loop)  |
| Database      | Convex                          |
| Date          | 2026-09-22                      |
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

- Zero unreconciled stock discrepancies at end-of-day, enforced by
  `userStockLogs` mutation validation.
- Stock issued via `storeTransactions` is reflected exclusively on the correct
  calendar day's `userStockLogs` record, with no cross-day contamination.
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
closing stock at end of day.

**Key concerns:** opening stock for the day, additional stock collected during
the day, sales made, closing stock balance.

**Convex access pattern:** Queries on `shifts` and `userStockLogs` scoped to
their own `userId` and the current `logDate`. Mutations to create and update
`userStockLogs` for today's date only.

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

**Live app:** `shifts` are property-wide staff sessions (`employeeId`), not bar-only. `barId` is required only for F&B. Waiters start and end work on **Attendance Tracker** (`startShift` / `endShift`); logging in does not create a shift. Ad-hoc Shift create/Finalize still exists. End shift also drafts payroll Hours. Stock-log fields and indexes in this section remain the F&B snapshot — see `ai/payroll-implementation.md` for the staff scheduling model.

**FR-SHF-001** — A Convex mutation shall create a `shifts` document when a
waiter begins a working session, recording `userId`, `barId`, `shiftDate`
(ISO 8601 string), `startTime`, and setting `isFinalized: false`.

**FR-SHF-002** — `userStockLogs` records are daily documents scoped to a single
`(userId, barId, beverageId, logDate)` combination. For each beverage in the
shift, a Convex mutation shall create or update the `userStockLogs` document
for **today's date** (`logDate = current ISO 8601 date string`). The record
shall contain:

| Field              | Source                                                                      |
|--------------------|-----------------------------------------------------------------------------|
| `shiftId`          | Reference to the shift that opened this day                                 |
| `userId`           | Denormalized from the shift — identifies the waiter                         |
| `barId`            | Denormalized from the shift — identifies the bar                            |
| `beverageId`       | The beverage being tracked                                                  |
| `logDate`          | ISO 8601 date string for today, e.g. `"2026-03-26"`                        |
| `openingStock`     | Previous day's `closingStock` for same `(userId, barId, beverageId)`, or 0 |
| `newStockReceived` | Cumulative qty issued via `storeTransactions` on this day                  |
| `totalStock`       | Computed in mutation: `openingStock + newStockReceived`                     |
| `closingStock`     | Manual entry at end of day                                                  |
| `salesQuantity`    | Computed in mutation: `totalStock − closingStock`                           |
| `salesValue`       | Computed in mutation: `salesQuantity × beverage.unitPrice`                  |
| `isFinalized`      | Set to `false` on creation; `true` after end-of-day reconciliation          |
| `lastUpdatedAt`    | `Date.now()` at time of mutation                                            |

> Derived fields are persisted in the document (not computed at query time) to
> avoid cross-document reads in Convex query functions.

**FR-SHF-003** — The mutation creating or updating a `userStockLogs` document
shall validate that `closingStock <= totalStock`. If the check fails, the
mutation shall throw a `ConvexError` and the document shall not be written.

**FR-SHF-004** — The following indexes on `userStockLogs` shall support
efficient day-scoped queries:

| Index                       | Fields                                 | Use case                                     |
|-----------------------------|----------------------------------------|----------------------------------------------|
| `by_shiftId`                | `[shiftId]`                            | Load all beverage logs for a shift           |
| `by_userId_barId_bev_date`  | `[userId, barId, beverageId, logDate]` | Primary lookup — one record per beverage/day |
| `by_userId_barId_date`      | `[userId, barId, logDate]`             | All beverages for a user at a bar on a day   |
| `by_barId_date`             | `[barId, logDate]`                     | All stock at a bar on a given day            |

**FR-SHF-005** — When a waiter finalises their day, a mutation shall set
`isFinalized: true` on the `userStockLogs` document for each beverage.
Subsequent mutation attempts to modify a finalized `userStockLogs` entry shall
be rejected unless the caller has a manager or administrator role. The parent
`shifts` document shall also be set to `isFinalized: true`.

**FR-SHF-006** — The opening stock for a new day's `userStockLogs` entry shall
be pre-filled by querying the most recent finalized `userStockLogs` document for
the same `(userId, barId, beverageId)`, ordered by `logDate` descending, using
the `by_userId_barId_bev_date` index. If no prior record exists, `openingStock`
defaults to `0`.

**FR-SHF-007** — Waiters with `fnb.read` use **My Stock Today**
(`/admin/bar-management/my-stock`). Queries `getMyTodayStock` and mutations
`addMyTodayBeverage`, `saveMyClosingStock`, and `finalizeMyToday` are scoped to
the authenticated `userId` and the property timezone `logDate` from
`propertyDateKey`. Waiters cannot edit another user's logs from this page.

---

### 4.3 Bar Inventory Management — Store Manager View

**FR-INV-001** — The system shall maintain one `storeInventory` document per
beverage. The `by_beverageId` index on this table shall be used to retrieve or
upsert a beverage's inventory record within a single indexed query.

**FR-INV-002** — When new supplier stock arrives, a Convex mutation shall:
1. Insert a `storeTransactions` document with `txnType: "receive"`, setting both
   `txnDate` (epoch ms) and `txnDateKey` (ISO 8601 date string).
2. Increment `qtyInStore` on the corresponding `storeInventory` document.
3. Update `lastUpdated` to `Date.now()`.

All three writes shall occur within the same Convex mutation to guarantee atomicity.

**FR-INV-003** — When a user collects stock from the store, a Convex mutation
shall:
1. Insert a `storeTransactions` document with `txnType: "issue"`, including
   `barId`, `userId`, `txnDate` (epoch ms), and `txnDateKey` (ISO 8601 date
   string derived from the current date).
2. Decrement `qtyInStore` on the corresponding `storeInventory` document.
3. Look up the `userStockLogs` record for `(userId, barId, beverageId, txnDateKey)`
   using the `by_userId_barId_bev_date` index:
   - If found and `isFinalized: false`: increment `newStockReceived` by `qty`
     and recompute `totalStock = openingStock + newStockReceived`.
   - If not found: create a new `userStockLogs` document for that day, seeding
     `openingStock` from the previous day's `closingStock` (or `0`), and setting
     `newStockReceived = qty`, `totalStock = openingStock + qty`.
   - If found and `isFinalized: true`: throw a `ConvexError` — stock cannot be
     issued to a closed day.
4. Check if `qtyInStore` has fallen to or below `reorderThreshold`. If so, and
   if no `reorderAlerts` document with `status: "open"` exists for that
   `beverageId` (checked via `by_beverageId_status` index), insert a new
   `reorderAlerts` document.

All writes shall occur within the same Convex mutation to guarantee atomicity.

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

### 4.4 Sales and Performance Analytics — Bar Management hub

**Live page:** `/admin/bar-management` (`fnb.read`). Charts that read
`salesSummaries` also need `reports.read`. Reorder tiles need `inventory.read`.
The property dashboard F&B tab stays a **today snapshot** and links here — it
does not host these charts. Spec: `ai/dashboard.md`, `ai/pageSetup.md`.

**Sales identity:** `salesQuantity = totalStock − closingStock` (stock that
disappeared at selling price `beverage.unitPrice`). This mixes true sales with
spill, comps, and shrinkage until a wastage or POS ticket path exists.

**FR-ANA-001** — Cron jobs in `convex/crons.ts` paginate finalized
`userStockLogs` into `salesSummaries`: daily `0 1 * * *`, weekly Monday
`0 2 * * 1`, monthly `0 3 1 * *`, yearly `0 4 1 1 *` (functions in
`convex/cron.ts`). Dates use the property timezone (`propertyDateKey` /
`localDayBounds`), not UTC.

**FR-ANA-002** — Hub period control: **Daily / Weekly / Monthly / Yearly /
YoY**. Daily–yearly use the current `periodKey` for that `periodType`. YoY is
year-to-date through the current property month versus the same months last
year (`getYearOnYearOverview`).

**FR-ANA-003** — Layout (top to bottom):
1. Commercial KPIs: Total Revenue, Total Quantity Sold, Active Bars, Active
   Staff. YoY adds `% vs last year YTD` on revenue and qty.
2. Health KPIs from `getBarHealthMetrics` (`convex/barHealth.ts`, `fnb.read`):
   stock days finalized (waiter–bar–day sessions), open reorders + oldest age,
   stale reorders (open or acknowledged ≥ 24h), revenue per waiter-shift.
   Yearly/YoY finalization uses the last 30 `userStockLogs` days; commercial
   yearly/YoY SKU and waiter totals prefer `salesSummaries`.
3. Tabs (dashboard Button style; only the active chart mounts): Bar Performance,
   Top Performers (chart plus shifts / revenue / per-shift table), Revenue
   Trend, Sales by Category, SKU Performance (top 5 and slowest 5 by revenue).
4. Open reorder alerts table (`getOpenReorderAlerts`).

**FR-ANA-004** — Bar comparison: `getSalesByBarPeriod` groups current-period
`salesSummaries` (`by_propertyId_periodType_periodKey`) by `barId`.

**FR-ANA-005** — Waiter comparison: `getSalesByUserPeriod` groups the same
rows by `userId`. Health ranks waiters by revenue per shift, not raw total.

**FR-ANA-006** — Revenue trend: `getRevenueTrend` returns the last N
`periodKey`s (daily 7, weekly 7, monthly 7, yearly up to 5). YoY trend is two
monthly series (this year vs last year).

**FR-ANA-007** — Category mix and SKU ranks use current-period summaries or
live logs (health). Pour cost, average check, and RevPASH are **not** on this
hub (`beverages` have `unitPrice` only; no covers).

**FR-ANA-008** — Issue and receive are single mutations that **validate then
write** (throw on failure). Editing or deleting an issue reverses
`userStockLogs` and store qty. Issue requires bar, user, existing inventory,
and quantity. Inventory create starts at qty 0; qty changes only via receive
or issue.

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

**NFR-PERF-004** — The `by_userId_barId_bev_date` compound index on
`userStockLogs` shall be used for all day-scoped stock update lookups initiated
by `storeTransactions` mutations, ensuring O(log n) resolution of the target
record without table scans.

### 5.2 Real-Time

**NFR-RT-001** — The store manager's inventory dashboard and reorder alert panel
shall use Convex reactive queries (`useQuery` on the client) so that any
inventory change is reflected in the UI without polling.

**NFR-RT-002** — Waiter stock log changes shall be reflected in real-time for
any manager viewing the same day's progress, via subscribed queries filtered by
`barId` and `logDate`.

### 5.3 Security

**NFR-SEC-001** — All Convex query and mutation functions shall validate the
caller's identity via `ctx.auth.getUserIdentity()`. Functions shall throw if the
identity is absent or if the user's role does not permit the action.

**NFR-SEC-002** — The `users` table `externalId` shall be the sole bridge
between the external auth provider and Convex documents. JWT tokens shall never
be stored in Convex.

**NFR-SEC-003** — Row-level scoping shall be enforced in Convex functions: waiter
queries shall always filter by the caller's `userId` and the current `logDate`
to prevent cross-user and cross-day data access.

**NFR-SEC-004** — Convex environment variables shall store all secrets (e.g.
auth provider keys). No secrets shall appear in schema or function source code.

### 5.4 Reliability

**NFR-REL-001** — All multi-step stock operations (issue stock + update inventory
+ update `userStockLogs` + check reorder) shall occur within a single Convex
mutation, leveraging Convex's serialisable transaction guarantees to prevent
partial writes.

**NFR-REL-002** — The cron job for `salesSummaries` aggregation shall be
idempotent — re-running it for the same period shall update existing summary
documents rather than creating duplicates. A compound lookup using
`by_barId_beverage_period` shall detect existing records before inserting.

**NFR-REL-003** — The `issueStock` mutation shall be idempotent with respect to
`userStockLogs`: if a record for `(userId, barId, beverageId, logDate)` already
exists and is not finalized, the mutation shall patch it rather than insert a
duplicate.

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

| Convex Table        | Role                                                                    |
|---------------------|-------------------------------------------------------------------------|
| `bars`              | Physical bar outlets                                                    |
| `beverages`         | Drink products                                                          |
| `users`             | All platform users (waiters, managers, admins)                          |
| `shifts`            | Working sessions per user per bar                                       |
| `userStockLogs`     | **Daily**, per-user, per-bar, per-beverage stock and sales reconciliation |
| `storeInventory`    | Live central store balance per beverage (1:1 with beverages)            |
| `storeTransactions` | Audit log of all stock movements; drives `userStockLogs` updates        |
| `reorderAlerts`     | System-generated low-stock notifications                                |
| `salesSummaries`    | Pre-aggregated sales data for reporting                                 |

### 6.2 System Fields

Convex automatically adds the following to every document:

| Field            | Type     | Description                            |
|------------------|----------|----------------------------------------|
| `_id`            | `Id<T>`  | Globally unique document identifier    |
| `_creationTime`  | `number` | Epoch ms timestamp at document creation|

These fields are never declared in `convex/schema.ts`.

### 6.3 Timestamp Convention

All application-managed timestamps (e.g. `lastLoginAt`, `lastUpdatedAt`,
`lastUpdated`, `txnDate`, `alertedAt`) are stored as `number` (milliseconds
since epoch via `Date.now()`). Calendar dates (e.g. `shiftDate`, `logDate`,
`txnDateKey`) and clock times (e.g. `startTime`, `endTime`) are stored as ISO
8601 strings to preserve timezone-independent semantics and enable direct string
comparison in indexed queries.

### 6.4 Daily Stock Log Identity

Each `userStockLogs` document is uniquely identified by the composite key
`(userId, barId, beverageId, logDate)`. This natural key is enforced at the
application layer by the `issueStock` mutation, which uses the
`by_userId_barId_bev_date` index to check for an existing record before
inserting. No two documents may share the same combination of these four fields.

### 6.5 storeTransactions → userStockLogs Update Flow

When an `"issue"` transaction is recorded, the mutation follows this flow:

```
storeTransactions "issue" created (txnDateKey = today's ISO date)
  │
  ├─► storeInventory.qtyInStore  −= qty
  │
  └─► userStockLogs lookup by (userId, barId, beverageId, txnDateKey)
          │
          ├── Found, isFinalized: false  →  patch newStockReceived += qty
          │                                        totalStock = openingStock + newStockReceived
          │
          ├── Not found                  →  insert new record for today
          │                                        openingStock = prev day closingStock (or 0)
          │                                        newStockReceived = qty
          │                                        totalStock = openingStock + qty
          │
          └── Found, isFinalized: true   →  throw ConvexError (day is closed)
```

This guarantees that stock issued on Wednesday updates **only** Wednesday's log.
Tuesday's record is never touched once finalized.

### 6.6 Aggregation Strategy

Convex enforces limits on documents read per transaction. The `salesSummaries`
table exists to pre-aggregate data so that reporting queries remain O(1) against
indexes rather than O(n) table scans. The cron-based aggregation pipeline reads
finalized `userStockLogs` records filtered by `logDate`:

```
Finalized userStockLogs (by logDate) → salesSummaries (daily)
                                     → salesSummaries (weekly)   [Monday cron]
                                     → salesSummaries (monthly)  [1st of month cron]
                                     → salesSummaries (yearly)   [1st Jan cron]
```

### 6.7 Referential Integrity

Convex does not enforce foreign key constraints at the database level.
Referential integrity is the responsibility of mutation functions:

- Before inserting a `shifts` document, the mutation validates that the
  referenced `userId` and `barId` documents exist and are active.
- Before inserting a `userStockLogs` document, the mutation validates `shiftId`,
  `userId`, `barId`, and `beverageId`, and checks for an existing record with
  the same `(userId, barId, beverageId, logDate)` to prevent duplicates.
- Before inserting a `storeTransactions` document, the mutation validates
  `beverageId`, and `userId`/`barId` if present.
- Deletion of `bars` or `beverages` documents is blocked by mutation logic if
  related documents exist.

---

## 7. Business Rules

**BR-001** — Each bar must have at least one active user assigned before a shift
can be created. The shift creation mutation shall verify this.

**BR-002** — A user may work at most one active (non-finalized) shift per bar at
any given time. The mutation shall query `by_userId_date` before inserting a
new shift.

**BR-003** — Every `newStockReceived` increment in `userStockLogs` must be
backed by a corresponding `storeTransactions` issue record created in the same
mutation. The `issueStock` mutation shall atomically create the transaction,
decrement store inventory, and patch or create the matching day's stock log.

**BR-004** — A `reorderAlerts` document of status `"open"` shall be created at
most once per beverage. The mutation shall check `by_beverageId_status` before
inserting a new alert.

**BR-005** — `salesQuantity` shall never be negative. A negative computed value
shall cause the mutation to throw a `ConvexError`, preventing the document write.

**BR-006** — `salesSummaries` aggregation shall only process `userStockLogs`
documents where `isFinalized: true`.

**BR-007** — A beverage with `isActive: false` shall not appear in new daily
stock log templates. The query that returns available beverages for a day's log
shall filter using the `by_isActive` index.

**BR-008** — `salesSummaries` upsert logic shall use `periodKey` + `barId` +
`beverageId` + `userId` + `periodType` as the natural composite key to detect
duplicates. An existing record shall be patched (`ctx.db.patch`), not replaced,
to preserve `_creationTime`.

**BR-009** — A `storeTransactions` mutation with `txnType: "issue"` shall never
update a `userStockLogs` record whose `isFinalized` flag is `true`. The mutation
shall throw a `ConvexError` if this condition is detected, and no writes shall
occur.

**BR-010** — `logDate` on `userStockLogs` and `txnDateKey` on
`storeTransactions` are the property-local calendar date (`propertyDateKey` /
`localDayBounds` + `propertyTimeZone`). Do not persist a client-supplied date
without validating it against that server date.

---

## 8. Reporting Requirements

| Report Name                  | Source                                                         | Audience       | Period                                |
|------------------------------|----------------------------------------------------------------|----------------|---------------------------------------|
| Daily stock reconciliation   | `userStockLogs` `by_userId_barId_date` / My Stock Today        | Waiter         | Property-local `logDate`              |
| Bar daily stock overview     | `userStockLogs` `by_barId_date`                                | Store Manager  | Per day                               |
| Inventory status             | `storeInventories`                                             | Store Manager  | Real-time                             |
| Stock movement log           | `storeTransactions`                                            | Store Manager  | Date range                            |
| Open reorder alerts          | `reorderAlerts` `by_propertyId_status`                         | Store Manager  | Real-time                             |
| Hub commercial KPIs          | `getSalesByBarPeriod` / `getSalesByUserPeriod`                 | F&B + reports  | Daily / Weekly / Monthly / Yearly / YoY |
| Hub health KPIs + SKUs       | `getBarHealthMetrics` (`userStockLogs` + optional summaries)   | `fnb.read`     | Same period control                   |
| Sales by bar / user          | `salesSummaries` `by_propertyId_periodType_periodKey`          | `reports.read` | Current period key                    |
| Revenue trend                | `getRevenueTrend`                                              | `reports.read` | Last N keys; YoY monthly overlay      |
| Year-on-year YTD             | `getYearOnYearOverview` (monthly summaries Jan–current month)  | `reports.read` | This year vs last year YTD            |
| SKU top / slowest            | Health query ranks by revenue                                  | `fnb.read`     | Current period                        |

---

## 9. Convex Function Index

The following Convex functions shall be implemented. All files reside in the
`convex/` directory.

### Queries (`query`)

| Function                         | File                         | Description                                                       |
|----------------------------------|------------------------------|-------------------------------------------------------------------|
| `getBarHealthMetrics`            | `convex/barHealth.ts`        | Finalization, reorders, revenue/shift, SKU ranks, YoY deltas      |
| `getSalesByBarPeriod`            | `convex/salesSummaries.ts`   | Current period grouped by bar                                     |
| `getSalesByUserPeriod`           | `convex/salesSummaries.ts`   | Current period grouped by waiter                                  |
| `getRevenueTrend`                | `convex/salesSummaries.ts`   | Last N period keys (daily/weekly/monthly/yearly)                  |
| `getYearOnYearOverview`          | `convex/salesSummaries.ts`   | Monthly this year vs last year through current month              |
| `getSalesSummaries`              | `convex/salesSummaries.ts`   | Filtered summary rows (category mix)                              |
| `getOpenReorderAlerts`           | `convex/reorderAlerts.ts`    | Open alerts with beverage + qty in store                          |
| `getMyTodayStock`                | `convex/userStockLogs.ts`    | Authenticated waiter's logs for property-local today              |

Legacy names `convex/analytics.ts`, `convex/stockLogs.ts`, and `convex/alerts.ts`
are not used. CRUD lives in `convex/bars.ts`, `convex/beverages.ts`,
`convex/userStockLogs.ts`, `convex/storeInventories.ts`,
`convex/storeTransactions.ts`.

### Mutations (`mutation`)

| Function                         | File                    | Description                                                                                    |
|----------------------------------|-------------------------|------------------------------------------------------------------------------------------------|
| `upsertUserFromSSO`              | `convex/users.ts`       | Creates or updates a user on SSO login                                                         |
| `createShift`                    | `convex/shifts.ts`      | Opens a new shift for a user at a bar                                                          |
| `finalizeShift`                  | `convex/shifts.ts`      | Sets `isFinalized: true` on a shift and all its `userStockLogs` records                        |
| `createUserStockLog` / `updateUserStockLog` | `convex/userStockLogs.ts` | Manager upsert of a stock log with validation |
| `receiveStock` / `issue`         | `convex/storeTransactions.ts` | Create receive/issue; issue applies to today's stock log; may open reorder alert |
| `update` / `delete` transaction  | `convex/storeTransactions.ts` | Reverse prior issue/receive effects on inventory and logs          |
| `acknowledgeReorderAlert`        | `convex/reorderAlerts.ts`     | Transitions alert to `"acknowledged"`                              |
| `resolveReorderAlert`            | `convex/reorderAlerts.ts`     | Transitions alert to `"resolved"`                                  |
| `saveMyClosingStock`             | `convex/userStockLogs.ts`     | Waiter closing count for today                                     |
| `finalizeMyToday`                | `convex/userStockLogs.ts`     | Finalizes the waiter's today logs                                  |

### Scheduled Mutations (`internalMutation` + `cron`)

| Function                         | File                    | Schedule           | Description                                                      |
|----------------------------------|-------------------------|--------------------|------------------------------------------------------------------|
| `aggregateDailySummaries`        | `convex/cron.ts`        | Daily at 01:00     | Rolls up finalized `userStockLogs` (by `logDate`) into daily summaries |
| `aggregateWeeklySummaries`       | `convex/cron.ts`        | Monday at 02:00    | Rolls daily → weekly summaries                                   |
| `aggregateMonthlySummaries`      | `convex/cron.ts`        | 1st of month 03:00 | Rolls daily → monthly summaries                                  |
| `aggregateYearlySummaries`       | `convex/cron.ts`        | 1st Jan 04:00      | Rolls monthly → yearly summaries                                 |

---

## 10. Assumptions and Constraints

- The data model supports any number of active bars at a property.
- Each waiter works at one bar per F&B shift. Multi-bar shifts are out of scope.
- One `userStockLogs` document exists per `(userId, barId, beverageId, logDate)`.
  If a waiter covers multiple shifts in one day at the same bar, they share a
  single daily stock log per beverage.
- Beverage pricing is `unitPrice` at log time. There is no cost price, so pour
  cost is out of scope.
- The bar module does not process payments or customer-facing orders. Sales
  volume is inferred from stock counts.
- `logDate` and `txnDateKey` are property-local dates from `propertyDateKey`.
  Client-supplied date overrides are not permitted without server validation.
- Convex document read limits apply. Aggregation jobs paginate. Health metrics
  cap logs per day (`take(80)`).

---

## 11. Out of Scope

The following are explicitly excluded from v1:

- Customer-facing ordering or point-of-sale tickets (sales ≠ POS covers)
- Beverage unit cost, pour cost %, comps/wastage reasons
- Average check and RevPASH (no guest/seat counts)
- Integration with external accounting software (QuickBooks, Sage, etc.)
- Bar restock as Task Assignment (`reorderAlerts` stay on this module)
- Native mobile apps (iOS/Android); mobile-responsive web is sufficient
- Full-text search on beverage names

---

## 12. Glossary

| Term                  | Definition                                                                                                    |
|-----------------------|---------------------------------------------------------------------------------------------------------------|
| `_id`                 | Convex auto-generated unique document identifier of type `Id<"tableName">`.                                   |
| `_creationTime`       | Convex auto-generated epoch ms timestamp added to every document.                                             |
| Bar                   | A physical outlet within the premises where beverages are sold.                                               |
| Beverage              | Any drink product tracked by the system.                                                                      |
| Closing Stock         | Physical count of unsold units remaining at end of a day.                                                     |
| Convex Cron           | A scheduled Convex mutation in `convex/crons.ts` via `crons.cron(...)`.                                       |
| Convex Index          | A `.index("name", ["field"])` declaration on a table used for O(log n) filtered queries.                      |
| Convex Mutation       | A Convex server function that reads and writes data atomically within a serialisable transaction.             |
| Convex Query          | A Convex server function that reads data reactively; clients subscribe and receive live updates.               |
| `Date.now()`          | The standard way to record the current epoch ms timestamp within a Convex mutation.                           |
| Issue                 | A `storeTransactions` record with `txnType: "issue"` — stock moved from store to a bar/user.                  |
| `logDate`             | ISO 8601 date string (e.g. `"2026-03-26"`) stored on `userStockLogs` identifying the calendar day the record covers. |
| Opening Stock         | Units a user starts the day with; last **finalized** `closingStock` for the same waiter, bar, and beverage, or 0. |
| `periodKey`           | A string encoding the summary period: `"YYYY-MM-DD"` (daily), `"YYYY-WNN"` (weekly), etc.                    |
| Receive               | A `storeTransactions` record with `txnType: "receive"` — stock received from a supplier.                      |
| Reorder Alert         | A `reorderAlerts` document created when a beverage's `qtyInStore` falls to or below `reorderThreshold`.       |
| Sales Quantity        | `totalStock − closingStock`; units that left stock that day (sold, spilled, or uncounted). Persisted in `userStockLogs`. |
| YoY                   | Hub period: this year YTD through the current property month vs the same months last year. |
| Sales Summary         | A pre-aggregated `salesSummaries` document covering a bar, user, beverage, and time period.                   |
| Shift                 | A working session, represented as a `shifts` document, assigned to one user at one bar on one date.           |
| SSO                   | Single Sign-On. Users authenticate via an external provider; `externalId` links the provider identity to Convex. |
| Store Inventory       | The `storeInventory` table; one document per beverage holding the live central store balance.                  |
| Total Stock           | `openingStock + newStockReceived`; total available to a user during a day. Persisted in `userStockLogs`.       |
| `txnDateKey`          | ISO 8601 date string (e.g. `"2026-03-26"`) stored on `storeTransactions`; used to locate the correct day's `userStockLogs` record without timestamp arithmetic. |
| User                  | Any platform user — waiter, manager, or administrator — represented as a `users` document.                    |
| `v.id("table")`       | Convex's typed foreign key validator referencing a document in the named table.                               |
| `v.optional(...)`     | Convex validator wrapper indicating a field may be absent (equivalent to TypeScript `field?: T`).             |
