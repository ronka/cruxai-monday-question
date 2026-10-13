import { CATEGORIES, LOCATIONS, seedProducts } from "@/data/adminData";
import { clock } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { AdminEvent, LedgerEntry, Location, Product, ProductPage, ProductPatch, ProductQuery, ProductStatus, Variant } from "@/types/admin";

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
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);
CREATE TABLE inventory_levels (
  variant_id TEXT NOT NULL REFERENCES variants(id),
  location_id TEXT NOT NULL,
  on_hand INTEGER NOT NULL CHECK (on_hand >= 0),
  PRIMARY KEY (variant_id, location_id)
);
CREATE TABLE inventory_ledger (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  at TEXT NOT NULL
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
        product.variants.forEach((variant, position) => {
          db.run("INSERT INTO variants VALUES (?, ?, ?, ?, ?, ?)", [
            variant.id,
            product.id,
            position,
            variant.title,
            variant.sku,
            variant.priceCents,
          ]);
          const shop = Math.floor(variant.inventory / 4);
          const split = { "loc-central": variant.inventory - shop + 10, "loc-shop": shop };
          for (const [locationId, onHand] of Object.entries(split)) {
            db.run("INSERT INTO inventory_levels VALUES (?, ?, ?)", [variant.id, locationId, onHand]);
            db.run("INSERT INTO inventory_ledger VALUES (?, ?, ?, ?, 'initial count', NULL, ?)", [
              `led-${variant.id}-${locationId}`,
              variant.id,
              locationId,
              onHand,
              now,
            ]);
          }
        });
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
type VariantRow = { id: string; product_id: string; title: string; sku: string; price_cents: number };

function hydrate(db: LocalDatabase, rows: ProductRow[]): Product[] {
  if (rows.length === 0) return [];
  const variants = db.all<VariantRow>(
    `SELECT * FROM variants WHERE product_id IN (${rows.map(() => "?").join(",")}) ORDER BY position`,
    rows.map((row) => row.id),
  );
  const levels = db.all<{ variant_id: string; location_id: string; on_hand: number }>(
    `SELECT * FROM inventory_levels WHERE variant_id IN (${variants.map(() => "?").join(",")})`,
    variants.map((variant) => variant.id),
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
        (variant): Variant => {
          const byLocation = Object.fromEntries(LOCATIONS.map((location) => [location.id, 0]));
          for (const level of levels) if (level.variant_id === variant.id) byLocation[level.location_id] = level.on_hand;
          return {
            id: variant.id,
            productId: variant.product_id,
            title: variant.title,
            sku: variant.sku,
            priceCents: variant.price_cents,
            inventory: Object.values(byLocation).reduce((sum, value) => sum + value, 0),
            levels: byLocation,
          };
        },
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
      if (!Number.isInteger(price) || price < 0) throw new Error("Prices must be whole, non-negative cents");
      db.run("UPDATE variants SET price_cents = ? WHERE id = ?", [price, variantId]);
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

export async function listLocations(): Promise<Location[]> {
  return simulate("listLocations", () => LOCATIONS);
}

/**
 * Applies stock changes atomically and appends one ledger entry per change.
 * Rejects (changing nothing) if any level would go below zero.
 */
export function applyInventoryChanges(
  db: LocalDatabase,
  changes: { variantId: string; locationId: string; delta: number }[],
  reason: string,
  reference: string | null = null,
): void {
  const touched = new Set<string>();
  db.transaction(() => {
    const at = clock.date().toISOString();
    for (const change of changes) {
      if (!Number.isInteger(change.delta)) throw new Error("Quantities must be whole numbers");
      if (!LOCATIONS.some((location) => location.id === change.locationId)) throw new Error("Unknown location");
      const variant = db.get<{ product_id: string }>("SELECT product_id FROM variants WHERE id = ?", [change.variantId]);
      if (!variant) throw new Error(`Variant ${change.variantId} not found`);
      db.run("INSERT OR IGNORE INTO inventory_levels VALUES (?, ?, 0)", [change.variantId, change.locationId]);
      const { on_hand } = db.get<{ on_hand: number }>("SELECT on_hand FROM inventory_levels WHERE variant_id = ? AND location_id = ?", [change.variantId, change.locationId])!;
      if (on_hand + change.delta < 0) throw new Error(`Not enough stock: ${on_hand} on hand, ${-change.delta} requested`);
      db.run("UPDATE inventory_levels SET on_hand = on_hand + ? WHERE variant_id = ? AND location_id = ?", [change.delta, change.variantId, change.locationId]);
      db.run("INSERT INTO inventory_ledger VALUES (?, ?, ?, ?, ?, ?, ?)", [newId("led-"), change.variantId, change.locationId, change.delta, reason, reference, at]);
      touched.add(variant.product_id);
    }
  });
  touched.forEach((productId) => events.emit({ type: "product", productId }));
}

/** Manual stock correction at one location (e.g. after a count). */
export async function adjustInventory(variantId: string, locationId: string, delta: number, reason = "correction"): Promise<void> {
  const db = await adminDb();
  return simulate("adjustInventory", () => applyInventoryChanges(db, [{ variantId, locationId, delta }], reason));
}

/** Ledger entries for a product's variants, newest first. */
export async function getInventoryLedger(productId: string): Promise<LedgerEntry[]> {
  const db = await adminDb();
  return simulate("getInventoryLedger", () =>
    db
      .all<{ id: string; variant_id: string; location_id: string; delta: number; reason: string; reference: string | null; at: string }>(
        "SELECT l.* FROM inventory_ledger l JOIN variants v ON v.id = l.variant_id WHERE v.product_id = ? ORDER BY l.at DESC, l.rowid DESC",
        [productId],
      )
      .map((row) => ({ id: row.id, variantId: row.variant_id, locationId: row.location_id, delta: row.delta, reason: row.reason, reference: row.reference, at: row.at })),
  );
}

/** Mock control: a shop sale removes one unit of a variant at the shop. */
export async function simulateShopSale(variantId: string): Promise<void> {
  const db = await adminDb();
  applyInventoryChanges(db, [{ variantId, locationId: "loc-shop", delta: -1 }], "sale");
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

export { network };

export async function resetAdminData(): Promise<void> {
  await (await adminDb()).reset();
}
