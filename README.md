# Storefront Admin — inventory transfers with partial receiving interview

A Shopify-inspired frontend starter for a feature implementation interview. The admin already has a paginated product catalog with search and category filters, and a product editor. Stock is tracked per variant at two locations — **Central Warehouse** and **Shoreditch Shop** — and every stock change is written to an inventory **ledger** shown on the product page. Data persists in browser SQLite. **Inventory transfers are the candidate's task; no transfer UI exists.**

Template: **Storefront Admin** (shared with the bulk-editing and discount-combinations questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002 and open any product to see per-location stock and its ledger.

## Task

1. Create transfers between the two locations with line items (variant + quantity) and states **draft → in transit → received** (decide how partial receipt is represented).
2. **Drafts** never change stock. **Shipping** removes the shipped quantity from the origin. **Receiving** adds accepted units at the destination.
3. Receive a shipment in **several batches**. Record **damaged** units separately; they are not added to sellable stock.
4. Prevent **overshipping** (more than the origin has) and **overreceiving** (more than shipped minus already received/damaged).
5. A retried receipt — for example after **Lose the response of the next stock change** — must not be applied twice.
6. Show remaining quantities per line, and the **stock impact** at both locations before each confirmation.

Add meaningful tests for the state machine, quantity limits, and idempotent receiving.

## What the starter provides

- **Locations** — `LOCATIONS` in `src/data/adminData.ts`; `listLocations()`.
- **Stock and ledger** — `applyInventoryChanges(db, changes, reason, reference)` applies several changes atomically (rejecting if any level would go negative) and appends a ledger entry per change. `adjustInventory` is the single-change API used by the editor's **Adjust** buttons; `getInventoryLedger(productId)` reads history.
- **Mock controls** — the shop sells one unit (stock moves underneath you), another admin edits the product, fail the next product save, lose the next stock-change response (the change applies but the caller sees an error), reset local data.
- **Browser SQLite** — `adminDb()` in `src/api/adminApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back every statement on error.

## Code map

- [App shell](src/components/admin/AdminApp.tsx), [catalog](src/components/admin/ProductList.tsx), [product editor](src/components/admin/ProductEditor.tsx).
- [Mock API](src/api/adminApi.ts), [fixtures](src/data/adminData.ts), [types](src/types/admin.ts).

## Mock API contract

- `listProducts(filters)`, `listProductIds(filters)`, `getProduct(id)` — variants include `inventory` (total) and `levels` (per location).
- `updateProduct(id, patch, expectedVersion?)` — title, category, status, variant prices.
- `listLocations()`, `adjustInventory(variantId, locationId, delta, reason?)`, `getInventoryLedger(productId)`.
- `subscribeToAdmin(listener)` emits `{ type: "product", productId }` after product or stock changes.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
