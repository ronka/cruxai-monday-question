export const CATEGORIES = ["Apparel", "Bags", "Home", "Kitchen", "Stationery", "Outdoors"];

type Seed = [title: string, vendor: string, category: string, color: string, basePrice: number, options: string[], draft?: boolean];

const SIZES = ["Small", "Medium", "Large"];
const seeds: Seed[] = [
  ["Everyday Cotton Tee", "Northline", "Apparel", "#1f2937", 2800, SIZES],
  ["Merino Crew Sweater", "Northline", "Apparel", "#6b7280", 8900, SIZES],
  ["Rain Shell Jacket", "Fjellwear", "Outdoors", "#0f766e", 14900, SIZES],
  ["Canvas Tote", "Harbor Goods", "Bags", "#d6c7a1", 3400, ["Natural", "Black"]],
  ["Roll-top Backpack", "Harbor Goods", "Bags", "#334155", 11900, ["20 L", "28 L"]],
  ["Stoneware Mug", "Kiln & Co", "Kitchen", "#c2410c", 2200, ["Speckled", "Matte black", "Sage"]],
  ["Pour-over Kettle", "Kiln & Co", "Kitchen", "#a8a29e", 6400, ["Steel"]],
  ["Linen Napkins (set of 4)", "Atelier Home", "Home", "#e7e5e4", 3600, ["Oat", "Clay", "Charcoal"]],
  ["Wool Throw Blanket", "Atelier Home", "Home", "#9a3412", 12800, ["Rust", "Moss"]],
  ["Dotted Notebook A5", "Paperfield", "Stationery", "#1e3a8a", 1800, ["Navy", "Forest", "Sand"]],
  ["Brass Pen", "Paperfield", "Stationery", "#b45309", 4200, ["Brass"]],
  ["Desk Organizer", "Paperfield", "Stationery", "#57534e", 3900, ["Walnut", "Oak"], true],
  ["Trail Water Bottle", "Fjellwear", "Outdoors", "#15803d", 2900, ["500 ml", "750 ml"]],
  ["Camp Enamel Plate", "Fjellwear", "Outdoors", "#f5f5f4", 1600, ["White", "Blue rim"]],
  ["Ribbed Beanie", "Northline", "Apparel", "#7f1d1d", 2600, ["One size"]],
  ["Chore Coat", "Northline", "Apparel", "#78350f", 16800, SIZES, true],
  ["Weekender Duffel", "Harbor Goods", "Bags", "#422006", 18900, ["Tan", "Olive"]],
  ["Glass Storage Jars", "Kiln & Co", "Kitchen", "#bae6fd", 2400, ["Small", "Large"]],
  ["Cast Iron Skillet", "Kiln & Co", "Kitchen", "#171717", 5400, ['10"', '12"']],
  ["Waffle Bath Towel", "Atelier Home", "Home", "#fafaf9", 4600, ["White", "Stone"]],
  ["Ceramic Planter", "Atelier Home", "Home", "#d9f99d", 3800, ["Small", "Medium", "Large"]],
  ["Weekly Planner", "Paperfield", "Stationery", "#fde68a", 2400, ["2026", "2027"]],
  ["Packable Down Vest", "Fjellwear", "Outdoors", "#1e40af", 13900, SIZES],
  ["Crossbody Sling", "Harbor Goods", "Bags", "#3f6212", 5800, ["Black", "Olive"]],
  ["Oxford Shirt", "Northline", "Apparel", "#bfdbfe", 7400, SIZES],
  ["Linen Apron", "Atelier Home", "Kitchen", "#a3a3a3", 4400, ["Natural", "Indigo"]],
  ["Sketchbook Set", "Paperfield", "Stationery", "#fecaca", 3200, ["Set of 3"], true],
  ["Insulated Tumbler", "Fjellwear", "Outdoors", "#0e7490", 3400, ["Sea", "Sand", "Slate"]],
];

export interface SeedProduct {
  id: string;
  title: string;
  vendor: string;
  category: string;
  color: string;
  status: "active" | "draft";
  variants: { id: string; title: string; sku: string; priceCents: number; inventory: number }[];
}

export const seedProducts: SeedProduct[] = seeds.map(([title, vendor, category, color, base, options, draft], index) => ({
  id: `prod-${index + 1}`,
  title,
  vendor,
  category,
  color,
  status: draft ? "draft" : "active",
  variants: options.map((option, variantIndex) => ({
    id: `var-${index + 1}-${variantIndex + 1}`,
    title: option,
    sku: `${title.replace(/[^A-Z]/g, "").slice(0, 3) || "SKU"}-${String(index + 1).padStart(3, "0")}-${variantIndex + 1}`,
    priceCents: base + variantIndex * (options.length > 2 ? 200 : 0),
    inventory: (index * 7 + variantIndex * 5) % 23 === 0 ? 0 : ((index * 13 + variantIndex * 11) % 60) + 1,
  })),
}));

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export const seedCollections = [
  { id: "col-outdoors", title: "Outdoor Gear", productIds: ["prod-3", "prod-13", "prod-14", "prod-23", "prod-28"] },
  { id: "col-kitchen", title: "Kitchen Essentials", productIds: ["prod-6", "prod-7", "prod-18", "prod-19", "prod-26"] },
  { id: "col-gifts", title: "Gift Ideas", productIds: ["prod-6", "prod-9", "prod-10", "prod-11", "prod-15", "prod-28"] },
];

/** The supplied test cart: [variantId, quantity]. Shipping is a flat $8.95. */
export const seedCartLines: [string, number][] = [
  ["var-6-2", 2],
  ["var-3-2", 1],
  ["var-10-1", 3],
  ["var-19-1", 1],
];
export const CART_SHIPPING_CENTS = 895;

const T = (iso: string) => new Date(iso).toISOString();
export const seedDiscounts = [
  { id: "disc-1", code: "OUTDOOR15", title: "15% off outdoor gear", kind: "product_percentage", status: "active", value: 15, collectionIds: ["col-outdoors"], minimumSubtotalCents: null, startsAt: T("2026-10-01T00:00:00Z"), endsAt: T("2026-10-31T23:59:59Z"), combinesWith: { product: false, order: true, shipping: true } },
  { id: "disc-2", code: "KITCHEN20", title: "20% off kitchen", kind: "product_percentage", status: "active", value: 20, collectionIds: ["col-kitchen"], minimumSubtotalCents: null, startsAt: T("2026-10-10T00:00:00Z"), endsAt: T("2026-10-14T12:00:00Z"), combinesWith: { product: false, order: false, shipping: true } },
  { id: "disc-3", code: "TAKE10", title: "$10 off orders over $100", kind: "order_amount", status: "active", value: 1000, collectionIds: [], minimumSubtotalCents: 10000, startsAt: T("2026-09-01T00:00:00Z"), endsAt: null, combinesWith: { product: true, order: false, shipping: true } },
  { id: "disc-4", code: "SHIPFREE", title: "Free shipping", kind: "free_shipping", status: "active", value: null, collectionIds: [], minimumSubtotalCents: 5000, startsAt: T("2026-10-01T00:00:00Z"), endsAt: null, combinesWith: { product: true, order: true, shipping: false } },
  { id: "disc-5", code: "GIFT25", title: "25% off gifts (draft)", kind: "product_percentage", status: "draft", value: 25, collectionIds: ["col-gifts"], minimumSubtotalCents: null, startsAt: null, endsAt: null, combinesWith: { product: false, order: false, shipping: false } },
  { id: "disc-6", code: "BIGSPEND", title: "$200 off (draft, larger than most carts)", kind: "order_amount", status: "draft", value: 20000, collectionIds: [], minimumSubtotalCents: null, startsAt: null, endsAt: null, combinesWith: { product: true, order: false, shipping: true } },
] as const;
