# Storefront Admin — bulk product editing interview

A Shopify-inspired frontend starter for a feature implementation interview. The admin already has a paginated product catalog (28 products, 10 per page) with search, category filters, URL state, and a single-product editor for title, status (availability), category, and per-variant price and inventory. Saves are atomic and detect concurrent edits through a product `version`. Data persists in browser SQLite. **Bulk editing is the candidate's task and is not implemented.**

Template: **Storefront Admin** (shared with the inventory-transfers and discount-combinations questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add bulk editing for **price**, **availability** (Active/Draft), and **category**. Price changes can be absolute or relative (e.g. −10 %); decide and document rounding in cents.
2. Users can select individual products, or **every product matching the current filters across all pages**.
3. Selection stays understandable when filters, search, or the page change (what is still selected, and what will be edited?).
4. Before applying, show a **preview** that lists which variants will change and their before/after values.
5. Apply changes with **partial-failure** handling: show which products failed and why, and **retry only the failed ones**.
6. Concurrent edits must not be silently overwritten: if another admin saved a product after the preview, surface it instead of clobbering it.

Add meaningful tests for selection semantics, preview computation, and partial-failure retry.

## What the starter provides

- **Optimistic concurrency** — `updateProduct(id, patch, expectedVersion)` rejects with `VersionConflictError` (carrying the latest product) when the version moved.
- **All matching IDs** — `listProductIds(filters)` returns every product ID for a filter set without pagination.
- **Mock controls** — another admin edits a random product (or the open one); fail the next product save; reset local data. Call `failNextProductUpdate()` repeatedly in tests to simulate several failures.
- **Browser SQLite** — `adminDb()` in `src/api/adminApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/admin/AdminApp.tsx): routing (`?q=&category=&page=` or `?product=`), live updates, mock controls.
- [Catalog](src/components/admin/ProductList.tsx): filters, table, pagination.
- [Product editor](src/components/admin/ProductEditor.tsx): draft, save bar, conflict banner.
- [Mock API](src/api/adminApi.ts), [fixtures](src/data/adminData.ts), [types](src/types/admin.ts).

## Mock API contract

- `listProducts({ search?, category?, status?, page?, pageSize? })` → `{ items, total, page, pageSize }`.
- `listProductIds(filters)`, `getProduct(id)`, `listCategories()`.
- `updateProduct(id, { title?, category?, status?, variants?: { [variantId]: { priceCents?, inventory? } } }, expectedVersion?)` — one product per call, atomic.
- `subscribeToAdmin(listener)` emits `{ type: "product", productId }` on every saved change.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
