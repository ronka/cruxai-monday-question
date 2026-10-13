"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PawPrint, Star } from "lucide-react";
import { getCalendar, getListing, getQuote } from "@/api/stayApi";
import { formatMoney } from "@/data/stayData";
import { addDays, formatDay } from "@/lib/dates";
import type { StayQuery } from "@/types/stay";
import { Photo } from "./ListingCard";

function Month({ first, days, checkIn, checkOut }: { first: string; days: Map<string, { available: boolean; priceCents: number }>; checkIn: string; checkOut: string }) {
  const start = new Date(`${first}T00:00:00Z`);
  const offset = start.getUTCDay();
  const length = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return (
    <div>
      <h4 className="mb-2 text-center font-semibold">{formatDay(first, { month: "long", year: "numeric" })}</h4>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[12px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="text-neutral-500">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`x${i}`} />)}
        {Array.from({ length }, (_, i) => {
          const key = addDays(first, i);
          const day = days.get(key);
          const inStay = key >= checkIn && key < checkOut;
          return (
            <span key={key} className={`flex flex-col items-center rounded-md py-1 ${inStay ? "bg-neutral-900 text-white" : !day?.available ? "text-neutral-300 line-through" : ""}`}>
              {i + 1}
              {day?.available && <span className={`text-[10px] ${inStay ? "text-neutral-300" : "text-neutral-500"}`}>${Math.round(day.priceCents / 100)}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Listing details with an availability calendar and a booking card. */
export function ListingPage({ listingId, query, onBack }: { listingId: string; query: StayQuery; onBack: () => void }) {
  const listing = useQuery({ queryKey: ["listing", listingId], queryFn: () => getListing(listingId), retry: false });
  const firstMonth = `${query.checkIn.slice(0, 7)}-01`;
  const secondMonth = addDays(`${addDays(firstMonth, 32).slice(0, 7)}-01`, 0);
  const calendar = useQuery({
    queryKey: ["calendar", listingId, firstMonth],
    queryFn: () => getCalendar(listingId, firstMonth, addDays(`${addDays(secondMonth, 32).slice(0, 7)}-01`, 0)),
  });
  const quote = useQuery({
    queryKey: ["quote", listingId, query.checkIn, query.checkOut, query.guests],
    queryFn: () => getQuote(listingId, query.checkIn, query.checkOut, query.guests),
  });
  if (listing.isPending) return <p role="status" className="p-10 text-neutral-500">Loading listing…</p>;
  if (listing.isError) return <p role="alert" className="p-10">This listing is no longer available. <button className="underline" onClick={onBack}>Back to search</button></p>;
  const data = listing.data;
  const days = new Map((calendar.data ?? []).map((day) => [day.date, day]));
  return (
    <div className="mx-auto max-w-6xl px-10 py-6">
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-2 text-[14px] font-semibold underline"><ArrowLeft className="h-4 w-4" /> Back to results</button>
      <h1 className="mb-4 text-[26px] font-semibold">{data.title}</h1>
      <div className="mb-8 grid h-80 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl">
        <Photo listing={data} className="col-span-2 row-span-2" />
        {[0, 1, 2, 3].map((i) => <Photo key={i} listing={{ ...data, palette: i % 2 ? [data.palette[1], data.palette[0]] : data.palette }} />)}
      </div>
      <div className="grid grid-cols-[1fr_380px] gap-16">
        <div>
          <h2 className="text-[22px] font-semibold">{data.kind} in {data.city}, {data.country}</h2>
          <p className="text-neutral-600">{data.maxGuests} guests · {data.bedrooms} bedroom{data.bedrooms > 1 && "s"} · minimum {data.minNights} night{data.minNights > 1 && "s"}</p>
          <p className="mt-1 flex items-center gap-1 font-semibold"><Star className="h-4 w-4 fill-current" /> {data.rating.toFixed(2)} · <span className="underline">{data.reviewCount} reviews</span></p>
          <hr className="my-6" />
          <p className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white">{data.hostName[0]}</span> Hosted by {data.hostName}</p>
          {data.petsAllowed && <p className="mt-3 flex items-center gap-2 text-neutral-600"><PawPrint className="h-4 w-4" /> Pets allowed</p>}
          <p className="mt-6 text-neutral-700">{data.description}</p>
          <h3 className="mb-2 mt-6 text-[18px] font-semibold">What this place offers</h3>
          <ul className="grid grid-cols-2 gap-2 text-neutral-700">{data.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
          <hr className="my-6" />
          <h3 className="mb-4 text-[18px] font-semibold">Availability</h3>
          {calendar.isPending ? <p className="text-neutral-500">Loading calendar…</p> : (
            <div className="grid grid-cols-2 gap-10">
              <Month first={firstMonth} days={days} checkIn={query.checkIn} checkOut={query.checkOut} />
              <Month first={secondMonth} days={days} checkIn={query.checkIn} checkOut={query.checkOut} />
            </div>
          )}
        </div>
        <aside className="sticky top-6 self-start rounded-xl border border-neutral-200 p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
          {quote.data?.ok ? (
            <>
              <p className="mb-4 text-[22px]"><span className="font-semibold">{formatMoney(Math.round(quote.data.quote.subtotalCents / quote.data.quote.nights))}</span> <span className="text-[16px]">night</span></p>
              <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-400 text-[12px]">
                <div className="border-r border-neutral-400 p-2.5"><b className="block text-[10px] uppercase">Check-in</b>{formatDay(query.checkIn, { month: "numeric", day: "numeric", year: "numeric" })}</div>
                <div className="p-2.5"><b className="block text-[10px] uppercase">Checkout</b>{formatDay(query.checkOut, { month: "numeric", day: "numeric", year: "numeric" })}</div>
                <div className="col-span-2 border-t border-neutral-400 p-2.5"><b className="block text-[10px] uppercase">Guests</b>{query.guests} guest{query.guests > 1 && "s"}</div>
              </div>
              <button type="button" disabled className="mb-3 w-full rounded-lg bg-[#ff385c] py-3 font-semibold text-white opacity-90" title="Booking is out of scope">Reserve</button>
              <dl className="space-y-2 text-neutral-700">
                <div className="flex justify-between"><dt className="underline">{formatMoney(Math.round(quote.data.quote.subtotalCents / quote.data.quote.nights))} avg × {quote.data.quote.nights} nights</dt><dd>{formatMoney(quote.data.quote.subtotalCents)}</dd></div>
                <div className="flex justify-between"><dt className="underline">Cleaning fee</dt><dd>{formatMoney(quote.data.quote.cleaningFeeCents)}</dd></div>
                <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold text-neutral-900"><dt>Total</dt><dd>{formatMoney(quote.data.quote.totalCents)}</dd></div>
              </dl>
            </>
          ) : quote.data ? (
            <p role="alert" className="text-neutral-700">{quote.data.reason} for {formatDay(query.checkIn)} – {formatDay(query.checkOut)}.</p>
          ) : (
            <p className="text-neutral-500">Checking availability…</p>
          )}
        </aside>
      </div>
    </div>
  );
}
