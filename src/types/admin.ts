export type ProductStatus = "active" | "draft";

export interface Variant {
  id: string;
  productId: string;
  /** e.g. "Small / Black". */
  title: string;
  sku: string;
  /** Integer cents. */
  priceCents: number;
  /** Total units on hand across all locations (derived). */
  inventory: number;
  /** Units on hand per location ID. */
  levels: Record<string, number>;
}

export interface Location {
  id: string;
  name: string;
  kind: "warehouse" | "shop";
}

export interface LedgerEntry {
  id: string;
  variantId: string;
  locationId: string;
  /** Positive adds stock, negative removes it. */
  delta: number;
  reason: string;
  /** Optional external reference, e.g. a transfer ID. */
  reference: string | null;
  at: string;
}

export interface Product {
  id: string;
  title: string;
  vendor: string;
  category: string;
  /** "active" products are available on the storefront. */
  status: ProductStatus;
  /** Swatch color for the placeholder thumbnail. */
  color: string;
  /** Increments on every saved change; used for optimistic concurrency. */
  version: number;
  updatedAt: string;
  variants: Variant[];
}

export interface ProductQuery {
  search?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductPatch {
  title?: string;
  category?: string;
  status?: ProductStatus;
  /** Per-variant changes keyed by variant ID. */
  variants?: Record<string, { priceCents?: number }>;
}

export type AdminEvent = { type: "product"; productId: string };
