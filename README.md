# Storefront Admin — discount combinations and cart preview interview

A Shopify-inspired frontend starter for a feature implementation interview. The admin already has a product catalog and editor (integer-cent prices), three product **collections**, a supplied **test cart**, and six **discount records** (four active, two drafts) shown on a read-only **Discounts** page. A mock clock decides which discounts have started or expired. Data persists in browser SQLite. **The discount editor and the cart preview math are the candidate's task and are not implemented.** No payment or checkout integration is needed.

Template: **Storefront Admin** (shared with the bulk-editing and inventory-transfers questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002/?section=discounts.

## Task

1. Build a **discount editor** (React Hook Form) for three kinds: percentage off products (optionally limited to collections), fixed amount off the order, and free shipping. Include code, eligibility (minimum subtotal, start/end), and **combination settings** (which classes it may combine with). Validate drafts versus activation.
2. **Preview** eligible savings against the test cart, per line and in total.
3. When several codes are entered and they conflict, choose the **best permitted combination** for the customer and **explain why each rejected code was rejected**.
4. Apply **product** discounts before **order** discounts. Never reduce a line, the order, or shipping below zero. Specify and implement rounding in **integer cents** (and how a percentage is allocated across lines).
5. Cart edits (including simulated ones) and start/end changes or clock moves must **recompute** the preview without showing stale results.

Add meaningful tests for combination selection, ordering, rounding, and clamping at zero.

## What the starter provides

- **Collections** — `listCollections()` (`col-outdoors`, `col-kitchen`, `col-gifts`; one product is in two collections).
- **Test cart** — `getCart()`, `setCartQuantity(variantId, quantity)`; flat $8.95 shipping. Prices come from the products.
- **Discount records** — `listDiscounts()`, `getDiscount(id)`, `saveDiscount(input)` (enforces unique codes only), `deleteDiscount(id)`. `KITCHEN20` expires Oct 14 12:00 UTC; `BIGSPEND` is larger than the cart.
- **Mock controls** — clock (+5 min … +1 week), customer adds a cart item, fail next discount save, reset local data.
- **React Hook Form** and `zod` are installed. Money helpers: `formatMoney(cents)` in `src/data/adminData.ts`.

## Code map

- [App shell](src/components/admin/AdminApp.tsx): sections (`?section=discounts`), live updates, mock controls.
- [Discounts page](src/components/admin/DiscountsPage.tsx): read-only list and test cart.
- [Mock API](src/api/adminApi.ts), [fixtures](src/data/adminData.ts), [types](src/types/admin.ts) (`Discount`, `Cart`, `Collection`).

## Mock API contract

- `getCart()`, `setCartQuantity(variantId, qty)`; `listCollections()`.
- `listDiscounts()`, `getDiscount(id)`, `saveDiscount(input)`, `deleteDiscount(id)`.
- `listProducts(filters)`, `getProduct(id)` for prices.
- `subscribeToAdmin(listener)` emits `{ type: "cart" }`, `{ type: "discount", discountId }`, or `{ type: "product", productId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
