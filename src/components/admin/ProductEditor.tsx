"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { adjustInventory, getInventoryLedger, getProduct, updateProduct, VersionConflictError } from "@/api/adminApi";
import { CATEGORIES, LOCATIONS } from "@/data/adminData";
import type { Product, ProductPatch, ProductStatus } from "@/types/admin";
import { StatusBadge, Thumbnail } from "./bits";

interface Draft {
  title: string;
  category: string;
  status: ProductStatus;
  variants: Record<string, { price: string }>;
}

function toDraft(product: Product): Draft {
  return {
    title: product.title,
    category: product.category,
    status: product.status,
    variants: Object.fromEntries(
      product.variants.map((variant) => [variant.id, { price: (variant.priceCents / 100).toFixed(2) }]),
    ),
  };
}

function toPatch(product: Product, draft: Draft): ProductPatch {
  const patch: ProductPatch = {};
  if (draft.title !== product.title) patch.title = draft.title;
  if (draft.category !== product.category) patch.category = draft.category;
  if (draft.status !== product.status) patch.status = draft.status;
  for (const variant of product.variants) {
    const edit = draft.variants[variant.id];
    const priceCents = Math.round(Number(edit.price) * 100);
    if (priceCents !== variant.priceCents) (patch.variants ??= {})[variant.id] = { priceCents };
  }
  return patch;
}

/** Single-product edit page with a save bar and version-conflict detection. */
export function ProductEditor({ productId, onBack }: { productId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["product", productId], queryFn: () => getProduct(productId), retry: false });
  const ledger = useQuery({ queryKey: ["ledger", productId], queryFn: () => getInventoryLedger(productId) });
  const [base, setBase] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.data && (!base || base.id !== query.data.id)) {
      setBase(query.data);
      setDraft(toDraft(query.data));
    }
  }, [query.data, base]);

  if (query.isPending) return <p role="status" className="p-8 text-neutral-500">Loading product…</p>;
  if (query.isError || !base || !draft)
    return (
      <p role="alert" className="p-8 text-neutral-600">
        Product not found. <button className="underline" onClick={onBack}>Back to products</button>
      </p>
    );

  const patch = toPatch(base, draft);
  const dirty = Object.keys(patch).length > 0;
  const newer = query.data && query.data.version !== base.version;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const saved = await updateProduct(base!.id, patch, base!.version);
      setBase(saved);
      setDraft(toDraft(saved));
      queryClient.setQueryData(["product", productId], saved);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (cause) {
      setError((cause as Error).message);
      if (cause instanceof VersionConflictError) queryClient.setQueryData(["product", productId], cause.current);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-neutral-500";
  return (
    <div className="mx-auto max-w-4xl">
      {dirty && (
        <div className="sticky top-0 z-20 -mx-6 mb-4 flex items-center justify-between bg-neutral-900 px-6 py-2.5 text-[13px] text-white">
          <span>Unsaved changes</span>
          <span className="flex gap-2">
            <button type="button" className="rounded-lg bg-neutral-700 px-3 py-1" onClick={() => setDraft(toDraft(base))}>Discard</button>
            <button type="button" disabled={saving} className="rounded-lg bg-white px-3 py-1 font-medium text-neutral-900 disabled:opacity-50" onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <button type="button" aria-label="Back to products" className="rounded-lg p-1 hover:bg-neutral-200" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold">{base.title}</h1>
        <StatusBadge status={base.status} />
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}
      {newer && !error && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          This product was updated elsewhere.{" "}
          <button className="underline" onClick={() => { setBase(query.data!); setDraft(toDraft(query.data!)); }}>Load latest</button>
        </p>
      )}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <label className="block text-[13px]">
              <span className="mb-1 block text-neutral-700">Title</span>
              <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <div className="flex items-center gap-3 text-[13px] text-neutral-600">
              <Thumbnail color={base.color} size={56} /> Media is managed by the brand team.
            </div>
          </section>
          <section className="rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <h2 className="px-4 pt-3 text-[13px] font-semibold">Variants</h2>
            <table className="mt-2 w-full text-[13px]">
              <thead className="text-left text-[12px] text-neutral-500">
                <tr>
                  <th className="px-4 py-1.5 font-medium">Variant</th><th className="px-2 font-medium">SKU</th><th className="px-2 font-medium">Price</th>
                  {LOCATIONS.map((location) => <th key={location.id} className="px-2 font-medium">{location.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {base.variants.map((variant) => (
                  <tr key={variant.id} className="border-t border-neutral-200">
                    <td className="px-4 py-2 font-medium">{variant.title}</td>
                    <td className="px-2 text-neutral-500">{variant.sku}</td>
                    <td className="px-2">
                      <label className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1">
                        $<input aria-label={`${variant.title} price`} inputMode="decimal" className="w-20 outline-none" value={draft.variants[variant.id].price}
                          onChange={(e) => setDraft({ ...draft, variants: { ...draft.variants, [variant.id]: { ...draft.variants[variant.id], price: e.target.value } } })} />
                      </label>
                    </td>
                    {LOCATIONS.map((location) => (
                      <td key={location.id} className="px-2 tabular-nums">
                        <span className="flex items-center gap-2">
                          {query.data?.variants.find((v) => v.id === variant.id)?.levels[location.id] ?? 0}
                          <button
                            type="button"
                            className="rounded border border-neutral-300 px-1.5 text-[11px] text-neutral-600 hover:bg-neutral-100"
                            aria-label={`Adjust ${variant.title} at ${location.name}`}
                            onClick={async () => {
                              const delta = Number(window.prompt(`Adjust ${variant.title} at ${location.name} by (e.g. -2 or 5)`));
                              if (!delta) return;
                              try {
                                await adjustInventory(variant.id, location.id, delta);
                              } catch (cause) {
                                setError((cause as Error).message);
                              }
                            }}
                          >
                            Adjust
                          </button>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rounded-xl bg-white p-4 text-[13px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <h2 className="mb-2 font-semibold">Inventory history</h2>
            <table className="w-full">
              <tbody>
                {ledger.data?.slice(0, 12).map((entry) => (
                  <tr key={entry.id} className="border-t border-neutral-100 text-neutral-600">
                    <td className="py-1">{new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td>{base.variants.find((v) => v.id === entry.variantId)?.title}</td>
                    <td>{LOCATIONS.find((l) => l.id === entry.locationId)?.name}</td>
                    <td className={`text-right tabular-nums ${entry.delta < 0 ? "text-red-700" : "text-emerald-700"}`}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</td>
                    <td className="pl-3">{entry.reason}{entry.reference && ` · ${entry.reference}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="space-y-2 rounded-xl bg-white p-4 text-[13px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <label className="block">
              <span className="mb-1 block font-semibold">Status</span>
              <select className={input} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductStatus })}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </section>
          <section className="space-y-2 rounded-xl bg-white p-4 text-[13px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            <label className="block">
              <span className="mb-1 block font-semibold">Category</span>
              <select className={input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <p className="text-neutral-500">Vendor: {base.vendor}</p>
            <p className="text-neutral-400">Version {base.version}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
