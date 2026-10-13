import type { ProductStatus } from "@/types/admin";

export function StatusBadge({ status }: { status: ProductStatus }) {
  return status === "active" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-medium text-emerald-800">Active</span>
  ) : (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[12px] font-medium text-sky-800">Draft</span>
  );
}

export function Thumbnail({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-lg border border-neutral-200"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    />
  );
}
