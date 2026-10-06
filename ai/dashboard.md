# Property Dashboard

Canonical spec for `/admin/dashboard`. This is a **permission-gated property health view**: financial P&L / RevPAR plus operational snapshots. It is not signed-in-person work (no “my shift”, “my tasks”). Personal work stays on My profile / My tasks. The broader metrics catalog is `ai/report_analytcs.md`.

Implementation lives in `app/admin/dashboard/` and `convex/dashboard.ts`. Route gate: `lib/proxy-permissions.ts`.

---

## Post-login routing

The dashboard is **not** a universal home.

| Condition | Destination |
|---|---|
| Authenticated user has `reports.read` | `/admin/dashboard` |
| Authenticated user does not have `reports.read` | `/admin/staff/myProfile` |

`staff.self.read` already allows My profile for any linked login.

Use one helper (`getPostLoginPath` in `lib/route-access.ts`) everywhere the app used to hardcode the dashboard as home:

- `proxy.ts` — `/`, signed-in sign-up, default sign-in `redirect_url`, finished setup
- `app/page.jsx`
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/setup/property/page.tsx` (new owners have `reports.read`, so they still land on the dashboard)
- `app/unauthorized/page.tsx` primary button (avoids a dashboard loop for staff without `reports.read`)
- `shared/pageHeader.tsx` `parentAdminPath` fallback for two-segment admin paths

Nav (`filterNavByAccess`) already hides Dashboard when `reports.read` is missing. Leave that as-is.

Do **not** special-case `canAccessPath` to open `/admin/dashboard` to every role.

---

## Page permission vs tab permissions

- **Page:** `reports.read` only. Visiting `/admin/dashboard` without it goes to `/unauthorized`.
- **P&L / RevPAR tab:** always listed for anyone who can open the page. Query `getFinancialReport` also requires `reports.read`.
- **Other tabs:** each module’s own read key. Hide the tab and do not run the Convex query when the key is missing so a missing permission never throws.

A custom role can have `reports.read` without `properties.read`. The page must not call `getAllProperties` (that query requires `properties.read`).

---

## Property scope

Add `listAccessibleProperties` in `convex/property.ts`:

- `args: {}`
- Auth via `getAuthContext`
- Load `authContext.propertyIds`
- Return `{ _id, name, currency, timezone }` only

The dashboard property `<select>` uses this query. Local React state is enough for this pass (not a shared app-wide property context).

Failed fetch shows an error, not “No properties yet!”. Empty `propertyIds` shows the empty-property state.

All numbers are for the **selected property**, not the signed-in user.

---

## Tabs

Summaries are tabs (inventory-hub button style). Default tab is **P&L / RevPAR**. Only permitted tabs are listed; the active tab’s query runs. Operational panels use the existing hub visual style (borders, KPI tiles, short lists) and link into that hub.

| Tab | Shown when | Data | Link |
|---|---|---|---|
| P&L / RevPAR | `reports.read` (page) | Period P&L + occupancy / ADR / RevPAR / TRevPAR / GOP / GOPPAR | Expenses (ledger) |
| Rooms | `rooms.read` or `reservations.read` | Occupancy counts; today’s arrivals / departures / in-house | Rooms / Reservations |
| Housekeeping | `housekeeping.task.read` | Open / overdue / unassigned counts; up to 5 overdue titles | Housekeeping board |
| Inventory | `inventory.read` | Active items, stock value, low stock, open POs | Inventory hub |
| Beverages today | `fnb.read` (target `beverages.read`) | Today’s POS qty + guest revenue (settled checks + paid open-tab amounts); waste/comps and open stock logs from float; open reorder count if `inventory.read` | POS (`/admin/pos`); stock hub (`/admin/bar-management`) |
| Restaurant today | `restaurant.read` | Today’s restaurant revenue, food cost %, open checks, occupied tables | `/admin/restaurant` |
| Billing | `billing.period.read` | Account count, overdue, due this week | Billing hub |

Do **not** put My shift or My tasks on this page.

Leave `app/admin/dashboard/components/sales-summary-charts.tsx` unused. Period bar charts, health KPIs, SKUs, and YoY live on `/admin/bar-management` (`app/admin/bar-management/components/sales-summary-charts.tsx`). Do not chart raw `salesSummaries` SKU rows on the property dashboard.

Money: format with the selected property’s `currency` (same pattern as inventory `formatPropertyMoney`). Period controls use `lib/cashPeriod.ts` (day / week / month / year) in the property timezone.

---

## P&L / RevPAR

`getFinancialReport` in `convex/dashboard.ts`. `reports.read`. Args: `propertyId`, `start`, `end` (cash-period bounds; `end` exclusive).

**Revenue**

- Rooms: overlapping nights of `confirmed` / `checked-in` / `checked-out` reservations in the period. Nightly amount is `rate` when `rate > 0`, otherwise `totalAmount / stay nights`.
- Beverages: settled beverage POS `orders.totalAmount` (plus `amountPaid` on `open_tab`) whose `openedAtDateKey` is in `[start, end)` property-local keys. Stock-implied `userStockLogs.salesValue` is **not** included (avoids double count); it remains on the bar hub as control.
- Restaurant: settled / open_tab `restaurantOrders` totals (`restaurantRevenue`) — do not merge with beverage `orders`.
- Total revenue = rooms + Beverages (POS) + Restaurant.

**Expenses**

- `expenses` in the period (`by_propertyId_expenseDate`), summed by category: Billing (`utilities`), Inventory (`supplies`), Payroll (`staff`), Maintenance, Other.
- GOP = total revenue − total expenses.

**Room inventory (current, not historical)**

- Sellable rooms = active rooms whose status is not `out-of-order` or `maintenance`.
- Available room nights = sellable rooms × period nights.
- Occupancy = rooms sold nights / available room nights.
- ADR = room revenue / rooms sold nights.
- RevPAR = room revenue / available room nights.
- TRevPAR = total revenue / available room nights.
- GOPPAR = GOP / available room nights.
- GOP margin and labor cost % vs total revenue.

---

## Queries

Reuse (client `skip` unless permitted):

- `api.inventoryItems.getInventoryDashboard` — `inventory.read`
- `api.billing.listDashboard` — `billing.period.read`
- `api.reorderAlerts.getOpenReorderAlerts` — `inventory.read`

Add slim snapshots in `convex/dashboard.ts`. Do **not** call `getAllRooms` or `getAllReservations` (they join every related document).

### `getFinancialReport`

See **P&L / RevPAR** above.

### `getRoomsSnapshot`

`rooms.read` and/or `reservations.read` via `tryRequirePermission`.

- Room counts by `available` / `occupied` / `out-of-order` / `maintenance` (`rooms` `by_propertyId`)
- Today’s arrivals / departures / in-house from `reservations`, using `propertyTimeZone` and existing date/status indexes
- Up to 5 arrival and 5 departure rows: confirmation number, guest last name, room number, time

### `getHousekeepingSnapshot`

`housekeeping.task.read`.

- Count open / overdue / unassigned from `housekeepingTasks` `by_propertyId` without enriching every row
- Up to 5 overdue titles: `taskType`, room number, `dueAt`

### `getBeveragesTodaySnapshot` (target name; live may still be `getFnBTodaySnapshot`)

`beverages.read` (live code may still check `fnb.read` until migration).

- Today’s `userStockLogs` for the property (index `by_propertyId_logDate` on `userStockLogs`)
- Return `totalQtySold`, `totalRevenue`, `openLogCount`, `finalizedLogCount`
- Property currency/timezone. Do not use `salesSummaries` for this card.
- Drill-through: Bar Management hub for Daily/Weekly/Monthly/Yearly/YoY charts and health KPIs (`getBarHealthMetrics`).

### `getRestaurantTodaySnapshot` (live)

`restaurant.read`. Guest restaurant revenue + food cost % for property-local today; open checks; occupied tables. Drill-through: `/admin/restaurant`. Do not merge with Beverages today / `getFnBTodaySnapshot`.

---

## Out of this pass

- Shared persisted property context across Dashboard / Bar / Inventory
- Role-specific landings beyond dashboard vs My profile
- Historical room inventory (out-of-order / maintenance as-of each night)
- Beverage unit cost / pour cost / wastage reasons on the bar hub
