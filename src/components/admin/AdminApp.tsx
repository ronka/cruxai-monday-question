"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Home, Inbox, Megaphone, Percent, Search, Settings, Store, Tag, Users } from "lucide-react";
import { failNextProductUpdate, network, resetAdminData, simulateOtherAdminEdit, simulateShopSale, subscribeToAdmin } from "@/api/adminApi";
import { MockControls } from "@/mock/MockControls";
import { ProductEditor } from "./ProductEditor";
import { ProductList, type CatalogFilters } from "./ProductList";

const NAV = [
  { label: "Home", icon: Home },
  { label: "Orders", icon: Inbox },
  { label: "Products", icon: Tag },
  { label: "Customers", icon: Users },
  { label: "Marketing", icon: Megaphone },
  { label: "Discounts", icon: Percent },
  { label: "Analytics", icon: BarChart3 },
];

function readUrl(): { filters: CatalogFilters; product: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    filters: { search: params.get("q") ?? "", category: params.get("category") ?? "", page: Math.max(1, Number(params.get("page")) || 1) },
    product: params.get("product"),
  };
}

export function AdminApp() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CatalogFilters>({ search: "", category: "", page: 1 });
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    const restore = () => {
      const url = readUrl();
      setFilters(url.filters);
      setProductId(url.product);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(
    () =>
      subscribeToAdmin((event) => {
        void queryClient.invalidateQueries({ queryKey: ["products"] });
        void queryClient.invalidateQueries({ queryKey: ["product", event.productId] });
        void queryClient.invalidateQueries({ queryKey: ["ledger", event.productId] });
      }),
    [queryClient],
  );

  const navigate = useCallback((next: { filters?: CatalogFilters; product?: string | null }) => {
    const nextFilters = next.filters ?? filters;
    const nextProduct = next.product === undefined ? productId : next.product;
    setFilters(nextFilters);
    setProductId(nextProduct);
    const params = new URLSearchParams();
    if (nextProduct) params.set("product", nextProduct);
    else {
      if (nextFilters.search) params.set("q", nextFilters.search);
      if (nextFilters.category) params.set("category", nextFilters.category);
      if (nextFilters.page > 1) params.set("page", String(nextFilters.page));
    }
    window.history.pushState(null, "", params.size ? `?${params}` : window.location.pathname);
  }, [filters, productId]);

  return (
    <div className="flex h-dvh flex-col bg-[#1a1a1a] text-neutral-900 [font-family:Inter,ui-sans-serif,-apple-system,'Segoe_UI',sans-serif]">
      <header className="flex h-14 shrink-0 items-center gap-4 px-4 text-white">
        <span className="flex w-52 items-center gap-2 font-semibold">
          <Store className="h-5 w-5 text-lime-400" /> storefront
        </span>
        <span className="flex w-[480px] items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-[13px] text-neutral-400">
          <Search className="h-4 w-4" /> Search
        </span>
        <span className="ml-auto flex items-center gap-2 text-[13px]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-400 text-[11px] font-bold text-neutral-900">FS</span>
          Fern &amp; Stone
        </span>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-t-xl bg-[#f1f1f1]">
        <nav aria-label="Admin" className="flex w-56 shrink-0 flex-col gap-0.5 bg-[#ebebeb] px-2 py-3 text-[13px] font-medium text-neutral-700">
          {NAV.map(({ label, icon: Icon }) => (
            <span key={label} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${label === "Products" ? "bg-white text-neutral-900 shadow-sm" : ""}`}>
              <Icon className="h-4 w-4" /> {label}
            </span>
          ))}
          <span className="mt-auto flex items-center gap-2 rounded-lg px-2 py-1.5"><Settings className="h-4 w-4" /> Settings</span>
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {productId ? (
            <ProductEditor key={productId} productId={productId} onBack={() => navigate({ product: null })} />
          ) : (
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Products</h1>
                <span className="flex gap-2 text-[13px]">
                  <span className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.1)]">Export</span>
                  <span className="rounded-lg bg-neutral-900 px-3 py-1.5 font-medium text-white">Add product</span>
                </span>
              </div>
              <ProductList filters={filters} onFiltersChange={(next) => navigate({ filters: next })} onOpen={(product) => navigate({ product: product.id })} />
            </div>
          )}
        </main>
      </div>
      <MockControls
        sections={[
          {
            title: "Other admins",
            actions: [
              { label: "Another admin edits a random product", run: () => simulateOtherAdminEdit() },
              ...(productId
                ? [
                    { label: "Another admin edits this product", run: () => simulateOtherAdminEdit(productId) },
                    { label: "Shop sells one unit (first variant)", run: () => simulateShopSale(`var-${productId.slice(5)}-1`) },
                  ]
                : []),
            ],
          },
          {
            title: "Failures",
            actions: [
              { label: "Fail next product save", run: failNextProductUpdate },
              { label: "Lose the response of the next stock change", run: () => network.loseNextResponse("adjustInventory") },
            ],
          },
        ]}
        onReset={resetAdminData}
      />
    </div>
  );
}
