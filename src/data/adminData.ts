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
