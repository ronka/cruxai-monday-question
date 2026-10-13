import { CATEGORIES, seedProducts } from "@/data/adminData";
import { clock } from "@/mock/clock";
import { createEmitter } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { AdminEvent, Product, ProductPage, ProductPatch, ProductQuery, ProductStatus, Variant } from "@/types/admin";

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

export async function resetAdminData(): Promise<void> {
  await (await adminDb()).reset();
}
