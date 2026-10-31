# Product Requirements Document
## Restaurant Management

| Field         | Detail                          |
|---------------|---------------------------------|
| Version       | 1.1                             |
| Status        | **Implemented** (R1–R4)         |
| Database      | Convex                          |
| Date          | 2026-10-06                      |
| Prepared by   | Product Team                    |

---

## 1. Positioning (no FnB umbrella)

**Beverages** and **Restaurant** are **independently operated** modules. There is no shared “Food & Beverage (FnB)” product surface, permission prefix, or department bucket.

| Module | Status | Owns |
|--------|--------|------|
| **Beverages** | Live | Bars, beverage catalog, float / store stock, beverage POS, cash-up, liabilities. Spec: `ai/Bar inventory and sales management system design PRD.md`. Live permissions still `fnb.*` (target rename `beverages.*`). Department still `fnb` in live shifts (target `beverages`). |
| **Restaurant** | **Live** | Food menu (kitchen + grill stations) with required food photos, recipes, restaurant ingredient inventory, tables, restaurant POS / kitchen board, settle + room charge. This document. Permissions: `restaurant.*`. Department: `restaurant`. |

They share payroll/shifts infrastructure, but **not** sellables, orders, stock ledgers, or analytics hubs. Restaurant ingredients live in `restaurantInventoryItems`, not hotel `inventoryItems` and not bar store inventory. Recipes written before that split may still point at hotel `inventoryItems` until they are resaved.

**Removed from product naming:** `FnbMenuItem`, FnB umbrella. Live beverage code may still use `fnb.*` / department `fnb` until a separate rename migration.

Case-study inputs: `ai/Restaurant case-study comparison.md` (Toast / Square / Simphony / MarketMan → R1–R3).

---

## 2. Goals (shipped)

1. One restaurant catalog with **stations** (`kitchen` | `grill` | `other`) — not a second product like Beverages.
2. Table / seat service, kitchen ticket flow, and settlement independent of beverage POS.
3. Recipe costing against restaurant ingredients (`restaurantInventoryItems`), not beverage float and not the hotel storeroom.
4. Separate P&L lines: beverage POS revenue (`fnbRevenue` today) vs **Restaurant** revenue (`restaurantRevenue`).

---

## 3. Out of scope (still deferred)

- Merging with Beverages catalog, float, or bar POS.
- Payment gateway (record tenders only).
- External restaurant POS sync.
- Tip pooling.
- Shared check mixing beverage + restaurant lines.
- Restaurant cash-up / staff liabilities (beverage cash-up remains separate).

---

## 4. Live schema (`convex/schema.ts`)

| Table | Purpose |
|-------|---------|
| `restaurantMenuItems` | Sellables; required `station`; price/cost; available/active; `imageUrl` required on create and update |
| `restaurantInventoryItems` | Restaurant-owned ingredients: sku, unit, on-hand qty, reorder, unit cost |
| `restaurantInventoryTransactions` | `receive` \| `usage` \| `adjustment` \| `waste` against those ingredients |
| `recipes` | One recipe per menu item (`propertyId` + `menuItemId`); `totalCost` / `lastCalculatedAt` |
| `recipeLines` | Ingredients → `restaurantInventoryItems` (qty, unit, waste %). `inventoryItemId` remains optional for lines saved against hotel stock |
| `restaurantTables` | Floor; status available / occupied / reserved / out-of-service; optional `currentOrderId` |
| `restaurantOrders` | Checks: `dine_in` \| `takeout` \| `room_service`; status `open` \| `open_tab` \| `settled` \| `voided`; `shiftId` + `employeeId` from the open restaurant shift; `checkSuffix` for lookup; tenders via `amountPaid` / `balanceDue`; `inventoryDeductedAt` |
| `restaurantOrderLines` | Snapshots + `lineStatus` active/voided + `prepStatus` pending→served + `station` |

**Do not** reuse beverage `orders` / `orderLines` (`beverageId`).

Design mirror also in `ai/schema.ts`.

---

## 5. Implementation map (R1–R3)

### Backend (Convex)

| Module | File |
|--------|------|
| Cost helpers | `convex/lib/restaurantCost.ts` |
| Menu CRUD | `convex/restaurantMenuItems.ts` |
| Restaurant inventory | `convex/restaurantInventory.ts`, `convex/lib/restaurantStock.ts` |
| Recipes + `listInventoryForRecipes` | `convex/recipes.ts` (catalog is restaurant ingredients) |
| Sale shift gate | `convex/lib/dutyContext.ts` (`requireRestaurantSaleShift`) |
| Tables | `convex/restaurantTables.ts` |
| POS / kitchen / settle / deduct | `convex/restaurantOrders.ts` |
| Today snapshot + P&L `restaurantRevenue` | `convex/dashboard.ts` (`getRestaurantTodaySnapshot`) |
| Cost refresh on inventory update | `convex/inventoryItems.ts` → `recalculateRecipesForInventoryItem` |

### UI (`app/admin/restaurant/`)

| Route | Phase | Role |
|-------|-------|------|
| `/admin/restaurant` | Hub | KPIs from `getRestaurantTodaySnapshot` |
| `/admin/restaurant/menu-items` | R1 | Catalog CRUD + station filter + required food photo |
| `/admin/restaurant/inventory` | R4 | Ingredient catalog and on-hand quantity |
| `/admin/restaurant/inventory/movements` | R4 | Receive, usage, waste, adjustment |
| `/admin/restaurant/recipes` | R1 | Upsert recipe against restaurant ingredients, replace lines, recalculate |
| `/admin/restaurant/tables` | R2 | Status board + create / setStatus |
| `/admin/restaurant/pos` | R2 | Open check only with a logged-in staff member on an open restaurant shift; add/void lines, settle / open tab / room charge. Menu buttons show food photos |
| `/admin/restaurant/orders` | R2 | Check ID search, waiter, opened date, pay down open tabs. Same shape as beverage POS orders, separate table |
| `/admin/restaurant/kitchen` | R2 | Station board; bump prep status |

Dashboard: **Restaurant today** tab (`restaurant.read`); P&L shows Restaurant revenue separately from Beverages (POS). Nav: sidebar + mobile under **Restaurant**.

### Settle & room charge

- Tenders: cash | card | room_charge | other (record only).
- Room charge payment type: **`restaurant_room_charge`** (not `fnb_room_charge`).
- Opening a check requires `restaurant.create` and `requireRestaurantSaleShift`: staff linked to the login, open shift, department `restaurant`. The check stores `shiftId`, `employeeId`, and `serverUserId`.
- Adding, voiding, settling, holding a tab, or paying a tab down requires the same open restaurant shift. A check with `shiftId` can only be changed by that waiter. Checks opened before the shift link (`shiftId` unset) stay editable.
- On settle to zero balance: set `completedAt` / `settledAt`, deduct inventory once (`inventoryDeductedAt`), clear table link.

### Inventory deduction

For each active line with a recipe: deduct `recipeLine.qty × orderLine.qty × (1 + waste%/100) / servings`.

- New lines deduct `restaurantInventoryItems` and write `restaurantInventoryTransactions` (`usage`). Quantity may go below zero so a short ingredient does not block settlement.
- Lines that still reference hotel `inventoryItems` deduct that storeroom and record a shortage, same as before they are rewritten.

---

## 6. Stations (kitchen + grill)

Managed **together** under Restaurant: same menu, orders, `restaurant.*`. Split by `station` for POS filter and kitchen board. No separate Grill product.

---

## 7. Permissions & department (live)

| Key | Use |
|-----|-----|
| `restaurant.read` | View hub, menu, recipes, tables, orders, kitchen, dashboard card |
| `restaurant.create` | Create menu items, tables, open orders |
| `restaurant.update` | Edit menu/recipes/tables, add/void/bump lines, settle, pay down |
| `restaurant.delete` | Deactivate menu items |

Department: `restaurant` on shifts / templates. Role matrix: Cook / Chef FULL, Kitchen Assistant LIMITED, Waiter LIMITED (also LIMITED beverages/`fnb`), Bartender NONE for restaurant. After deploy, run **`syncSystemRoles`** so stored role docs pick up `restaurant.*`.

---

## 8. Relationship to Beverages

| Concern | Beverages (live) | Restaurant (live) |
|---------|------------------|-------------------|
| Catalog | `beverages` | `restaurantMenuItems` |
| Stock | Float + store inventories | `restaurantInventoryItems` + movements; recipe deduct on settle |
| POS | `/admin/pos` + `orders`; F&B shift + bar required | `/admin/restaurant/pos` + `restaurantOrders`; restaurant shift required |
| Orders list | `/admin/pos/orders` check ID + waiter | `/admin/restaurant/orders` check ID + waiter |
| Hub | `/admin/bar-management` | `/admin/restaurant` |
| Permissions | `fnb.*` (rename later) | `restaurant.*` |
| Shift department | `fnb` (+ `barId`) | `restaurant` |
| Room charge | `fnb_room_charge` | `restaurant_room_charge` |

---

## 9. Follow-ups

1. Rename live `fnb.*` → `beverages.*` and department `fnb` → `beverages` (separate migration).
2. Sync system roles after deploy for `restaurant.*` on existing role documents.
3. Restaurant cash-up / liabilities (deferred).

---

## 10. Glossary

- **Station**: Production area (`kitchen`, `grill`, `other`). Not a separate module.
- **Restaurant check**: `restaurantOrders` guest bill — independent of beverage POS.
- **Food cost %**: (Recipe COGS of settled sales / Restaurant revenue) × 100 — not pour cost.
