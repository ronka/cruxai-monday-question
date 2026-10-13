import { Star } from "lucide-react";
import { formatMoney } from "@/data/stayData";
import { formatDay } from "@/lib/dates";
import type { Listing, Quote } from "@/types/stay";

export function Photo({ listing, className = "" }: { listing: Listing; className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${listing.palette[0]}, ${listing.palette[1]})` }}
    >
      <div className="absolute bottom-3 left-3 h-10 w-16 rounded-t-full bg-white/30" />
      <div className="absolute bottom-0 right-6 h-20 w-14 bg-white/25" />
    </div>
  );
}

/** Search result card. `quote` is the priced stay shown on the card. */
export function ListingCard({ listing, quote, onOpen }: { listing: Listing; quote: Quote; onOpen: () => void }) {
  return (
    <article>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <Photo listing={listing} className="mb-3 aspect-square rounded-xl" />
        <div className="flex justify-between gap-2 text-[15px]">
          <h3 className="truncate font-semibold">{listing.city}, {listing.country}</h3>
          <span className="flex shrink-0 items-center gap-1"><Star className="h-3.5 w-3.5 fill-current" /> {listing.rating.toFixed(2)}</span>
        </div>
        <p className="truncate text-[15px] text-neutral-500">{listing.title}</p>
        <p className="text-[15px] text-neutral-500">
          {formatDay(quote.checkIn)} – {formatDay(quote.checkOut)}
        </p>
        <p className="mt-1 text-[15px]">
          <span className="font-semibold">{formatMoney(Math.round(quote.subtotalCents / quote.nights))}</span> night ·{" "}
          <span className="text-neutral-500 underline">{formatMoney(quote.totalCents)} total</span>
        </p>
      </button>
    </article>
  );
}
