"use client";

import { useQuery } from "@tanstack/react-query";
import { getCart, listCollections, listDiscounts, listProducts } from "@/api/adminApi";
import { formatMoney } from "@/data/adminData";
import { useMockClock } from "@/mock/MockControls";
import type { Discount } from "@/types/admin";
import { Thumbnail } from "./bits";

const KIND_LABEL: Record<Discount["kind"], string> = {
  product_percentage: "Amount off products",
  order_amount: "Amount off order",
  free_shipping: "Free shipping",
};

function valueLabel(discount: Discount) {
  if (discount.value == null) return "—";
  return discount.kind === "product_percentage" ? `${discount.value}%` : formatMoney(discount.value);
}

/** Read-only discount list and the supplied test cart. No editor or price math exists yet. */
export function DiscountsPage() {
  const now = useMockClock();
  const discounts = useQuery({ queryKey: ["discounts"], queryFn: listDiscounts });
  const collections = useQuery({ queryKey: ["collections"], queryFn: listCollections });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const products = useQuery({ queryKey: ["products", "all"], queryFn: () => listProducts({ pageSize: 100 }) });
  const variant = (id: string) =>
    products.data?.items.flatMap((product) => product.variants.map((v) => ({ ...v, product }))).find((v) => v.id === id);
  const subtotal = cart.data?.lines.reduce((sum, line) => sum + (variant(line.variantId)?.priceCents ?? 0) * line.quantity, 0) ?? 0;
  const card = "rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.06)]";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[1fr_340px] gap-4">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Discounts</h1>
          <span className="rounded-lg bg-neutral-300 px-3 py-1.5 text-[13px] font-medium text-neutral-600" title="Not implemented yet">Create discount</span>
        </div>
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-[13px]">
            <thead className="bg-neutral-50 text-left text-[12px] text-neutral-600">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th><th className="px-2 font-medium">Type</th><th className="px-2 font-medium">Value</th>
                <th className="px-2 font-medium">Applies to</th><th className="px-2 font-medium">Status</th><th className="px-4 font-medium">Combines with</th>
              </tr>
            </thead>
            <tbody>
              {discounts.data?.map((discount) => {
                const expired = discount.endsAt && Date.parse(discount.endsAt) <= now;
                const scheduled = discount.startsAt && Date.parse(discount.startsAt) > now;
                return (
                  <tr key={discount.id} className="border-t border-neutral-200 align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{discount.code}</p>
                      <p className="text-neutral-500">{discount.title}</p>
                    </td>
                    <td className="px-2 py-2.5 text-neutral-600">{KIND_LABEL[discount.kind]}</td>
                    <td className="px-2 py-2.5 tabular-nums">{valueLabel(discount)}</td>
                    <td className="px-2 py-2.5 text-neutral-600">
                      {discount.collectionIds.length ? discount.collectionIds.map((id) => collections.data?.find((c) => c.id === id)?.title ?? id).join(", ") : "All products"}
                      {discount.minimumSubtotalCents != null && <p className="text-neutral-400">Min. {formatMoney(discount.minimumSubtotalCents)}</p>}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${discount.status === "draft" ? "bg-neutral-200 text-neutral-700" : expired ? "bg-red-100 text-red-800" : scheduled ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {discount.status === "draft" ? "Draft" : expired ? "Expired" : scheduled ? "Scheduled" : "Active"}
                      </span>
                      {discount.endsAt && <p className="mt-1 text-[12px] text-neutral-400">Ends {new Date(discount.endsAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {(["product", "order", "shipping"] as const).filter((key) => discount.combinesWith[key]).join(", ") || "None"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <aside className={`${card} self-start p-4 text-[13px]`}>
        <h2 className="mb-3 font-semibold">Test cart</h2>
        {cart.data?.lines.map((line) => {
          const v = variant(line.variantId);
          return (
            <div key={line.variantId} className="flex items-center gap-3 border-b border-neutral-100 py-2">
              {v && <Thumbnail color={v.product.color} size={32} />}
              <div className="flex-1">
                <p className="font-medium">{v?.product.title ?? line.variantId}</p>
                <p className="text-neutral-500">{v?.title} · {v ? formatMoney(v.priceCents) : ""} × {line.quantity}</p>
              </div>
              <span className="tabular-nums">{v ? formatMoney(v.priceCents * line.quantity) : ""}</span>
            </div>
          );
        })}
        <dl className="mt-3 space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd className="tabular-nums">{formatMoney(cart.data?.shippingCents ?? 0)}</dd></div>
          <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold"><dt>Total before discounts</dt><dd className="tabular-nums">{formatMoney(subtotal + (cart.data?.shippingCents ?? 0))}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
