import { CART_SHIPPING_CENTS, CATEGORIES, seedCartLines, seedCollections, seedDiscounts, seedProducts } from "@/data/adminData";
import { clock } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { AdminEvent, Cart, Collection, Discount, DiscountInput, Product, ProductPage, ProductPatch, ProductQuery, ProductStatus, Variant } from "@/types/admin";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  color TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  inventory INTEGER NOT NULL CHECK (inventory >= 0)
);
CREATE TABLE collections (id TEXT PRIMARY KEY, title TEXT NOT NULL, product_ids TEXT NOT NULL);
CREATE TABLE cart_lines (
  variant_id TEXT PRIMARY KEY REFERENCES variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE TABLE cart_meta (id TEXT PRIMARY KEY, shipping_cents INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE discounts (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, data TEXT NOT NULL, updated_at TEXT NOT NULL);
`;

export function adminDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "storefront",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const now = clock.date().toISOString();
      for (const product of seedProducts) {
        db.run("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, 1, ?)", [
          product.id,
          product.title,
          product.vendor,
          product.category,
          product.status,
          product.color,
          now,
        ]);
        product.variants.forEach((variant, position) =>
          db.run("INSERT INTO variants VALUES (?, ?, ?, ?, ?, ?, ?)", [
            variant.id,
            product.id,
            position,
            variant.title,
            variant.sku,
            variant.priceCents,
            variant.inventory,
          ]),
        );
      }
      for (const collection of seedCollections)
        db.run("INSERT INTO collections VALUES (?, ?, ?)", [collection.id, collection.title, JSON.stringify(collection.productIds)]);
      for (const [variantId, quantity] of seedCartLines) db.run("INSERT INTO cart_lines VALUES (?, ?)", [variantId, quantity]);
      db.run("INSERT INTO cart_meta VALUES ('cart', ?, ?)", [CART_SHIPPING_CENTS, now]);
      for (const discount of seedDiscounts)
        db.run("INSERT INTO discounts VALUES (?, ?, ?, ?)", [discount.id, discount.code, JSON.stringify(discount), now]);
    },
  });
}

const events = createEmitter<AdminEvent>();
/** Live product changes, including simulated edits by another admin. */
export const subscribeToAdmin = events.subscribe;

/** Rejected when `expectedVersion` no longer matches the stored product. */
export class VersionConflictError extends Error {
  constructor(readonly current: Product) {
    super(`“${current.title}” was changed by someone else. Review the latest version and try again.`);
    this.name = "VersionConflictError";
  }
}

type ProductRow = { id: string; title: string; vendor: string; category: string; status: ProductStatus; color: string; version: number; updated_at: string };
type VariantRow = { id: string; product_id: string; title: string; sku: string; price_cents: number; inventory: number };

function hydrate(db: LocalDatabase, rows: ProductRow[]): Product[] {
  if (rows.length === 0) return [];
  const variants = db.all<VariantRow>(
    `SELECT * FROM variants WHERE product_id IN (${rows.map(() => "?").join(",")}) ORDER BY position`,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    vendor: row.vendor,
    category: row.category,
    status: row.status,
    color: row.color,
    version: row.version,
    updatedAt: row.updated_at,
    variants: variants
      .filter((variant) => variant.product_id === row.id)
      .map(
        (variant): Variant => ({
          id: variant.id,
          productId: variant.product_id,
          title: variant.title,
          sku: variant.sku,
          priceCents: variant.price_cents,
          inventory: variant.inventory,
        }),
      ),
  }));
}

export function readProduct(db: LocalDatabase, id: string): Product {
  const row = db.get<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  if (!row) throw new Error("Product not found");
  return hydrate(db, [row])[0];
}

function where(query: ProductQuery): [string, string[]] {
  const clauses: string[] = [];
  const params: string[] = [];
  if (query.search?.trim()) {
    clauses.push("(title LIKE ? OR vendor LIKE ? OR id IN (SELECT product_id FROM variants WHERE sku LIKE ?))");
    const like = `%${query.search.trim()}%`;
    params.push(like, like, like);
  }
  if (query.category) {
    clauses.push("category = ?");
    params.push(query.category);
  }
  if (query.status) {
    clauses.push("status = ?");
    params.push(query.status);
  }
  return [clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params];
}

export async function listCategories(): Promise<string[]> {
  return simulate("listCategories", () => CATEGORIES);
}

/** Paginated catalog ordered by title. `page` is 1-based. */
export async function listProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const db = await adminDb();
  return simulate("listProducts", () => {
    const pageSize = query.pageSize ?? 10;
    const page = Math.max(1, query.page ?? 1);
    const [clause, params] = where(query);
    const { total } = db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM products ${clause}`, params)!;
    const rows = db.all<ProductRow>(`SELECT * FROM products ${clause} ORDER BY title LIMIT ? OFFSET ?`, [
      ...params,
      String(pageSize),
      String((page - 1) * pageSize),
    ]);
    return { items: hydrate(db, rows), total, page, pageSize };
  });
}

/** IDs of every product matching the filters (no pagination). */
export async function listProductIds(query: Omit<ProductQuery, "page" | "pageSize"> = {}): Promise<string[]> {
  const db = await adminDb();
  return simulate("listProductIds", () => {
    const [clause, params] = where(query);
    return db.all<{ id: string }>(`SELECT id FROM products ${clause} ORDER BY title`, params).map((row) => row.id);
  });
}

export async function getProduct(id: string): Promise<Product> {
  const db = await adminDb();
  return simulate("getProduct", () => readProduct(db, id));
}

function applyPatch(db: LocalDatabase, id: string, patch: ProductPatch, expectedVersion?: number): Product {
  const current = readProduct(db, id);
  if (expectedVersion !== undefined && expectedVersion !== current.version) throw new VersionConflictError(current);
  if (patch.category !== undefined && !CATEGORIES.includes(patch.category)) throw new Error(`Unknown category “${patch.category}”`);
  db.transaction(() => {
    db.run(
      "UPDATE products SET title = ?, category = ?, status = ?, version = version + 1, updated_at = ? WHERE id = ?",
      [patch.title?.trim() || current.title, patch.category ?? current.category, patch.status ?? current.status, clock.date().toISOString(), id],
    );
    for (const [variantId, change] of Object.entries(patch.variants ?? {})) {
      const variant = current.variants.find((item) => item.id === variantId);
      if (!variant) throw new Error(`Variant ${variantId} does not belong to ${current.title}`);
      const price = change.priceCents ?? variant.priceCents;
      const inventory = change.inventory ?? variant.inventory;
      if (!Number.isInteger(price) || price < 0) throw new Error("Prices must be whole, non-negative cents");
      if (!Number.isInteger(inventory) || inventory < 0) throw new Error("Inventory must be a whole, non-negative number");
      db.run("UPDATE variants SET price_cents = ?, inventory = ? WHERE id = ?", [price, inventory, variantId]);
    }
  });
  events.emit({ type: "product", productId: id });
  return readProduct(db, id);
}

/**
 * Saves product and variant changes atomically. Pass the `version` you edited
 * to reject the save with `VersionConflictError` if someone else saved first.
 */
export async function updateProduct(id: string, patch: ProductPatch, expectedVersion?: number): Promise<Product> {
  const db = await adminDb();
  return simulate("updateProduct", () => applyPatch(db, id, patch, expectedVersion));
}

export async function listCollections(): Promise<Collection[]> {
  const db = await adminDb();
  return simulate("listCollections", () =>
    db.all<{ id: string; title: string; product_ids: string }>("SELECT * FROM collections ORDER BY title").map((row) => ({
      id: row.id,
      title: row.title,
      productIds: JSON.parse(row.product_ids),
    })),
  );
}

function readCart(db: LocalDatabase): Cart {
  const meta = db.get<{ shipping_cents: number; updated_at: string }>("SELECT * FROM cart_meta WHERE id = 'cart'")!;
  const lines = db.all<{ variant_id: string; product_id: string; quantity: number }>(
    "SELECT c.variant_id, v.product_id, c.quantity FROM cart_lines c JOIN variants v ON v.id = c.variant_id ORDER BY c.rowid",
  );
  return {
    id: "cart",
    lines: lines.map((line) => ({ variantId: line.variant_id, productId: line.product_id, quantity: line.quantity })),
    shippingCents: meta.shipping_cents,
    updatedAt: meta.updated_at,
  };
}

/** The supplied test cart. Prices come from the current product data. */
export async function getCart(): Promise<Cart> {
  const db = await adminDb();
  return simulate("getCart", () => readCart(db));
}

/** Sets a line's quantity; 0 removes the line. */
export async function setCartQuantity(variantId: string, quantity: number): Promise<Cart> {
  const db = await adminDb();
  return simulate("setCartQuantity", () => {
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error("Quantity must be a whole number");
    if (!db.get("SELECT id FROM variants WHERE id = ?", [variantId])) throw new Error("Variant not found");
    if (quantity === 0) db.run("DELETE FROM cart_lines WHERE variant_id = ?", [variantId]);
    else db.run("INSERT INTO cart_lines VALUES (?, ?) ON CONFLICT(variant_id) DO UPDATE SET quantity = excluded.quantity", [variantId, quantity]);
    db.run("UPDATE cart_meta SET updated_at = ? WHERE id = 'cart'", [clock.date().toISOString()]);
    events.emit({ type: "cart" });
    return readCart(db);
  });
}

const toDiscount = (row: { data: string; updated_at: string }): Discount => ({ ...JSON.parse(row.data), updatedAt: row.updated_at });

export async function listDiscounts(): Promise<Discount[]> {
  const db = await adminDb();
  return simulate("listDiscounts", () => db.all<{ data: string; updated_at: string }>("SELECT * FROM discounts ORDER BY rowid").map(toDiscount));
}

export async function getDiscount(id: string): Promise<Discount> {
  const db = await adminDb();
  return simulate("getDiscount", () => {
    const row = db.get<{ data: string; updated_at: string }>("SELECT * FROM discounts WHERE id = ?", [id]);
    if (!row) throw new Error("Discount not found");
    return toDiscount(row);
  });
}

/**
 * Creates or replaces a discount record. Only storage rules are enforced here
 * (unique code, known kind); business validation belongs to the editor.
 */
export async function saveDiscount(input: DiscountInput): Promise<Discount> {
  const db = await adminDb();
  return simulate("saveDiscount", () => {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("Code is required");
    if (!["product_percentage", "order_amount", "free_shipping"].includes(input.kind)) throw new Error("Unknown discount kind");
    const id = input.id ?? newId("disc-");
    const clash = db.get<{ id: string }>("SELECT id FROM discounts WHERE code = ? AND id != ?", [code, id]);
    if (clash) throw new Error(`Code ${code} is already used`);
    const record = { ...input, id, code };
    db.run("INSERT INTO discounts VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code = excluded.code, data = excluded.data, updated_at = excluded.updated_at", [
      id,
      code,
      JSON.stringify(record),
      clock.date().toISOString(),
    ]);
    events.emit({ type: "discount", discountId: id });
    return toDiscount(db.get<{ data: string; updated_at: string }>("SELECT * FROM discounts WHERE id = ?", [id])!);
  });
}

export async function deleteDiscount(id: string): Promise<void> {
  const db = await adminDb();
  return simulate("deleteDiscount", () => {
    db.run("DELETE FROM discounts WHERE id = ?", [id]);
    events.emit({ type: "discount", discountId: id });
  });
}

/** Mock control: a customer adds one more of a random cart line. */
export async function simulateCartChange(): Promise<void> {
  const db = await adminDb();
  const line = db.get<{ variant_id: string; quantity: number }>("SELECT * FROM cart_lines ORDER BY RANDOM() LIMIT 1");
  if (!line) throw new Error("Cart is empty");
  await setCartQuantity(line.variant_id, line.quantity + 1);
}

/** Mock control: another admin edits a product (bumps its version). */
export async function simulateOtherAdminEdit(id?: string): Promise<Product> {
  const db = await adminDb();
  const target = id ?? db.get<{ id: string }>("SELECT id FROM products ORDER BY RANDOM() LIMIT 1")!.id;
  const product = readProduct(db, target);
  const variant = product.variants[0];
  return applyPatch(db, target, { variants: { [variant.id]: { priceCents: variant.priceCents + 100 } } });
}

/** The next `updateProduct` call fails without saving. */
export function failNextProductUpdate(): void {
  network.failNext("updateProduct");
}

export function failNextDiscountSave(): void {
  network.failNext("saveDiscount");
}

export async function resetAdminData(): Promise<void> {
  await (await adminDb()).reset();
  clock.reset();
}
