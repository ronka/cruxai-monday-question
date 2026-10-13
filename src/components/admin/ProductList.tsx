"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { listCategories, listProducts } from "@/api/adminApi";
import { formatMoney } from "@/data/adminData";
import type { Product } from "@/types/admin";
import { StatusBadge, Thumbnail } from "./bits";

export interface CatalogFilters {
  search: string;
  category: string;
  page: number;
}

interface Props {
  filters: CatalogFilters;
  onFiltersChange: (filters: CatalogFilters) => void;
  onOpen: (product: Product) => void;
}

function priceRange(product: Product) {
  const prices = product.variants.map((variant) => variant.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

/** Paginated product catalog with search and a category filter. */
export function ProductList({ filters, onFiltersChange, onOpen }: Props) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  useEffect(() => setSearchDraft(filters.search), [filters.search]);
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = window.setTimeout(() => onFiltersChange({ ...filters, search: searchDraft, page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters, onFiltersChange]);

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const products = useQuery({
    queryKey: ["products", filters],
    queryFn: () => listProducts({ search: filters.search, category: filters.category || undefined, page: filters.page }),
    placeholderData: keepPreviousData,
  });
  const data = products.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-2">
        {["", ...(categories.data ?? [])].map((category) => (
          <button
            key={category || "all"}
            type="button"
            onClick={() => onFiltersChange({ ...filters, category, page: 1 })}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${filters.category === category ? "bg-neutral-200/70 text-neutral-900" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            {category || "All"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[13px]">
          <Search className="h-4 w-4 text-neutral-500" />
          <span className="sr-only">Search products</span>
          <input
            className="w-56 outline-none"
            placeholder="Search title, vendor, or SKU"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </label>
      </div>
      <table className="w-full text-[13px]">
        <thead className="bg-neutral-50 text-left text-[12px] text-neutral-600">
          <tr>
            <th className="px-4 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Inventory</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Vendor</th>
            <th className="px-4 py-2 text-right font-medium">Price</th>
          </tr>
        </thead>
        <tbody className={products.isFetching && !products.isPending ? "opacity-60" : ""}>
          {products.isPending ? (
            <tr>
              <td colSpan={6} role="status" className="px-4 py-10 text-center text-neutral-500">Loading products…</td>
            </tr>
          ) : products.isError ? (
            <tr>
              <td colSpan={6} role="alert" className="px-4 py-10 text-center text-red-700">
                Could not load products. <button className="underline" onClick={() => void products.refetch()}>Retry</button>
              </td>
            </tr>
          ) : data!.items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">No products match these filters.</td>
            </tr>
          ) : (
            data!.items.map((product) => {
              const stock = product.variants.reduce((sum, variant) => sum + variant.inventory, 0);
              return (
                <tr key={product.id} onClick={() => onOpen(product)} className="cursor-pointer border-t border-neutral-200 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-3 font-medium text-neutral-900">
                      <Thumbnail color={product.color} />
                      {product.title}
                    </span>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={product.status} /></td>
                  <td className={`px-3 py-2 ${stock === 0 ? "text-red-700" : "text-neutral-600"}`}>
                    {stock} in stock{product.variants.length > 1 && ` for ${product.variants.length} variants`}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{product.category}</td>
                  <td className="px-3 py-2 text-neutral-600">{product.vendor}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-700">{priceRange(product)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 text-[13px] text-neutral-600">
        <span>{data ? `${data.total} products` : ""}</span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={filters.page <= 1}
            onClick={() => onFiltersChange({ ...filters, page: filters.page - 1 })}
            className="rounded-lg border border-neutral-300 p-1 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          Page {filters.page} of {pages}
          <button
            type="button"
            aria-label="Next page"
            disabled={filters.page >= pages}
            onClick={() => onFiltersChange({ ...filters, page: filters.page + 1 })}
            className="rounded-lg border border-neutral-300 p-1 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </span>
      </div>
    </div>
  );
}
