export type ProductStatus = "active" | "draft";

export interface Variant {
  id: string;
  productId: string;
  /** e.g. "Small / Black". */
  title: string;
  sku: string;
  /** Integer cents. */
  priceCents: number;
  /** Units on hand. */
  inventory: number;
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
  variants?: Record<string, { priceCents?: number; inventory?: number }>;
}

export type AdminEvent = { type: "product"; productId: string } | { type: "cart" } | { type: "discount"; discountId: string };

export interface Collection {
  id: string;
  title: string;
  productIds: string[];
}

export interface CartLine {
  variantId: string;
  productId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  /** Integer cents before any shipping discount. */
  shippingCents: number;
  updatedAt: string;
}

export type DiscountKind = "product_percentage" | "order_amount" | "free_shipping";

/** Stored discount record. Many fields are optional while a discount is a draft. */
export interface Discount {
  id: string;
  code: string;
  title: string;
  kind: DiscountKind;
  status: "draft" | "active";
  /** Percent (0–100) for product_percentage; cents for order_amount; unused for free_shipping. */
  value: number | null;
  /** Collections a product discount applies to. Empty means all products. */
  collectionIds: string[];
  minimumSubtotalCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  /** Which other discount classes this discount may combine with. */
  combinesWith: { product: boolean; order: boolean; shipping: boolean };
  updatedAt: string;
}

export type DiscountInput = Omit<Discount, "id" | "updatedAt"> & { id?: string };
