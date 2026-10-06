# Product Requirements Document
## Restaurant Management

| Field         | Detail                          |
|---------------|---------------------------------|
| Version       | 1.0                             |
| Status        | **Implemented** (R1–R3)         |
| Database      | Convex                          |
| Date          | 2026-10-06                      |
| Prepared by   | Product Team                    |

---

## 1. Positioning (no FnB umbrella)

**Beverages** and **Restaurant** are **independently operated** modules. There is no shared “Food & Beverage (FnB)” product surface, permission prefix, or department bucket.

| Module | Status | Owns |
|--------|--------|------|
| **Beverages** | Live | Bars, beverage catalog, float / store stock, beverage POS, cash-up, liabilities. Spec: `ai/Bar inventory and sales management system design PRD.md`. Live permissions still `fnb.*` (target rename `beverages.*`). Department still `fnb` in live shifts (target `beverages`). |
| **Restaurant** | **Live** | Food menu (kitchen + grill stations), recipes, tables, restaurant POS / kitchen board, settle + room charge, food cost / inventory deduct on settle. This document. Permissions: `restaurant.*`. Department: `restaurant`. |

They share property-level inventory (`inventoryItems`, POs) and payroll/shifts infrastructure, but **not** sellables, orders, stock ledgers, or analytics hubs.

**Removed from product naming:** `FnbMenuItem`, FnB umbrella. Live beverage code may still use `fnb.*` / department `fnb` until a separate rename migration.

Case-study inputs: `ai/Restaurant case-study comparison.md` (Toast / Square / Simphony / MarketMan → R1–R3).

---

## 2. Goals (shipped)

1. One restaurant catalog with **stations** (`kitchen` | `grill` | `other`) — not a second product like Beverages.
2. Table / seat service, kitchen ticket flow, and settlement independent of beverage POS.
3. Recipe costing against `inventoryItems` (not beverage float / store inventories).
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
| `restaurantMenuItems` | Sellables; required `station`; price/cost; available/active |
| `recipes` | One recipe per menu item (`propertyId` + `menuItemId`); `totalCost` / `lastCalculatedAt` |
| `recipeLines` | Ingredients → `inventoryItems` (qty, unit, waste %) |
| `restaurantTables` | Floor; status available / occupied / reserved / out-of-service; optional `currentOrderId` |
| `restaurantOrders` | Checks: `dine_in` \| `takeout` \| `room_service`; status `open` \| `open_tab` \| `settled` \| `voided`; tenders via `amountPaid` / `balanceDue`; `inventoryDeductedAt` |
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
| Recipes + `listInventoryForRecipes` | `convex/recipes.ts` |
| Tables | `convex/restaurantTables.ts` |
| POS / kitchen / settle / deduct | `convex/restaurantOrders.ts` |
| Today snapshot + P&L `restaurantRevenue` | `convex/dashboard.ts` (`getRestaurantTodaySnapshot`) |
| Cost refresh on inventory update | `convex/inventoryItems.ts` → `recalculateRecipesForInventoryItem` |

### UI (`app/admin/restaurant/`)

| Route | Phase | Role |
|-------|-------|------|
| `/admin/restaurant` | Hub | KPIs from `getRestaurantTodaySnapshot` |
| `/admin/restaurant/menu-items` | R1 | Catalog CRUD + station filter |
| `/admin/restaurant/recipes` | R1 | Upsert recipe, replace lines, recalculate |
| `/admin/restaurant/tables` | R2 | Status board + create / setStatus |
| `/admin/restaurant/pos` | R2 | Open check, add/void lines, settle / open tab / room charge |
| `/admin/restaurant/orders` | R2 | List + pay down open tabs |
| `/admin/restaurant/kitchen` | R2 | Station board; bump prep status |

Dashboard: **Restaurant today** tab (`restaurant.read`); P&L shows Restaurant revenue separately from Beverages (POS). Nav: sidebar + mobile under **Restaurant**.

### Settle & room charge

- Tenders: cash | card | room_charge | other (record only).
- Room charge payment type: **`restaurant_room_charge`** (not `fnb_room_charge`).
- On settle to zero balance: set `completedAt` / `settledAt`, deduct inventory once (`inventoryDeductedAt`), clear table link.

### Inventory deduction

For each active line with a recipe: deduct `recipeLine.qty × orderLine.qty × (1 + waste%/100) / servings` from `inventoryItems.currentQuantity`; write `inventoryTransactions` (`usage`, reference restaurant order line).

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
| Stock | Float + store inventories | Recipe → `inventoryItems` on settle |
| POS | `/admin/pos` + `orders` | `/admin/restaurant/pos` + `restaurantOrders` |
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
