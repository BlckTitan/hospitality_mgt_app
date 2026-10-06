# Restaurant case-study comparison (one page)

Shortlist vs design dimensions and our **R1 / R2 / R3** phases.  
Spec: `ai/Restaurant management system design PRD.md`.  
Interactive view: open the Cursor canvas `restaurant-case-study-matrix.canvas.tsx` beside chat.

**Scores** = case-study fit (Strong / Partial / Weak / N/A), not vendor rankings.  
**Shortlist:** Toast · Square for Restaurants · Oracle MICROS Simphony · MarketMan  
*(Apicbase is a MarketMan-class alternate for costing.)*

---

## 1. Catalog · Orders · Routing · Costing · Hotel link

| Dimension | What we care about | Toast | Square Restaurants | Oracle MICROS Simphony | MarketMan |
|-----------|-------------------|-------|--------------------|------------------------|-----------|
| **Catalog** | Menu, categories, stations (kitchen/grill), availability | **Strong** — menus + modifiers; station via prep config | **Strong** — menus + categories; lighter station model | **Strong** — multi-outlet menus; heavy | **Partial** — recipe/menu engineering; not full POS catalog UX |
| **Orders** | Tables, checks, dine-in / takeout / room service, settle | **Strong** — table service, tabs, courses | **Strong** — floor plan + checks; simpler | **Strong** — hotel outlet checks + folio | **N/A** — no guest POS |
| **Routing** | Kitchen vs grill tickets / KDS from one check | **Strong** — native KDS + multi-station | **Partial** — KDS; fewer station patterns | **Strong** — print/KDS by revenue center | **N/A** |
| **Costing** | Recipe → ingredient cost → food cost % | **Partial** — inventory add-ons; weaker theoretical cost | **Weak** — basic inventory | **Partial** — modules / integrations | **Strong** — recipes, waste/yield, cost refresh |
| **Hotel link** | Room charge / folio; restaurant revenue ≠ bar | **Partial** — hotel partners; not PMS-native | **Weak** — limited folio depth | **Strong** — Opera/folio; outlet P&L split | **N/A** |

---

## 2. Fit to our R1 / R2 / R3

| Phase (ours) | Toast | Square | Simphony | MarketMan | Implication |
|--------------|-------|--------|----------|-----------|-------------|
| **R1 — Catalog & costing** Menu CRUD + station; recipe builder; cost on ingredient price change | Partial | Weak | Partial | **Strong** | Use MarketMan (or Apicbase) as costing case study; build recipes natively or mirror that model |
| **R2 — Floor & orders** Tables, checks, line prep status, settle / room charge / open tab | **Strong** | **Strong** | **Strong** | N/A | Toast = primary UX; Square = MVP simplicity; Simphony = hotel room charge |
| **R3 — Ops & reporting** Deduct on complete; restaurant revenue + food cost %; cash-up TBD | Partial | Weak | Partial | **Strong** | Sales/outlet P&L from POS/hotel stack; food cost % from MarketMan-like model |

---

## 3. Recommended study mix

| Goal | Primary case study |
|------|--------------------|
| R2 floor + station routing + settle | **Toast** |
| Simpler MVP tables/checks | **Square for Restaurants** |
| Hotel room charge + independent outlet revenue (vs Beverages) | **Oracle MICROS Simphony** |
| R1/R3 recipes + food cost % | **MarketMan** (or **Apicbase**) |

**Gaps vs our PRD:** no shortlisted POS is recipe-first enough for R1 alone; kitchen + grill stay stations under one Restaurant module (Toast/Simphony-style routing); keep beverage checks separate — study Simphony revenue centers for P&L split, not a merged FnB check.

---

## Links

- Toast — https://www.toasttab.com/
- Square for Restaurants — https://squareup.com/us/en/point-of-sale/restaurants
- Oracle MICROS Simphony — https://www.oracle.com/food-beverage/restaurant-pos-systems/simphony/
- MarketMan — https://www.marketman.com/
- Apicbase (costing alternate) — https://apicbase.com/
