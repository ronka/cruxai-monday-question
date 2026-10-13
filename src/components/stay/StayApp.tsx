"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Menu, UserCircle2 } from "lucide-react";
import { failNextSearch, resetStayData, searchStays, simulateBooking, simulateHostDecision, simulateHostEditsReservation, simulatePriceChange, subscribeToStays } from "@/api/stayApi";
import { seedReservation } from "@/data/stayData";
import { TripsPage } from "./TripsPage";
import { isDateKey } from "@/lib/dates";
import { MockControls } from "@/mock/MockControls";
import type { StayQuery } from "@/types/stay";
import { ListingCard } from "./ListingCard";
import { ListingPage } from "./ListingPage";
import { SearchBar } from "./SearchBar";

const DEFAULT_QUERY: StayQuery = { destination: "Lisbon", checkIn: "2026-11-13", checkOut: "2026-11-16", guests: 2 };
type Sort = "recommended" | "price-asc" | "price-desc";

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  return {
    query: {
      destination: params.get("where") ?? DEFAULT_QUERY.destination,
      checkIn: isDateKey(checkIn) ? checkIn : DEFAULT_QUERY.checkIn,
      checkOut: isDateKey(checkOut) ? checkOut : DEFAULT_QUERY.checkOut,
      guests: Math.max(1, Number(params.get("guests")) || DEFAULT_QUERY.guests),
    },
    listing: params.get("listing"),
  };
}

export function StayApp() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<StayQuery>(DEFAULT_QUERY);
  const [listingId, setListingId] = useState<string | null>(null);
  const [section, setSection] = useState<"search" | "trips">("search");
  const [sort, setSort] = useState<Sort>("recommended");
  const [maxTotal, setMaxTotal] = useState("");

  useEffect(() => {
    const restore = () => {
      const url = readUrl();
      setQuery(url.query);
      setListingId(url.listing);
      setSection(new URLSearchParams(window.location.search).get("section") === "trips" ? "trips" : "search");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(
    () =>
      subscribeToStays(() => {
        void queryClient.invalidateQueries({ queryKey: ["search"] });
        void queryClient.invalidateQueries({ queryKey: ["calendar"] });
        void queryClient.invalidateQueries({ queryKey: ["quote"] });
        void queryClient.invalidateQueries({ queryKey: ["reservations"] });
      }),
    [queryClient],
  );

  function navigate(next: { query?: StayQuery; listing?: string | null }) {
    const q = next.query ?? query;
    const listing = next.listing === undefined ? listingId : next.listing;
    setQuery(q);
    setListingId(listing);
    setSection("search");
    const params = new URLSearchParams({ where: q.destination, checkIn: q.checkIn, checkOut: q.checkOut, guests: String(q.guests) });
    if (listing) params.set("listing", listing);
    window.history.pushState(null, "", `?${params}`);
    window.scrollTo(0, 0);
  }

  const results = useQuery({ queryKey: ["search", query], queryFn: () => searchStays(query), enabled: !listingId });
  const shown = useMemo(() => {
    const limit = Number(maxTotal) * 100;
    const list = (results.data ?? []).filter((r) => !maxTotal || r.quote.totalCents <= limit);
    if (sort === "price-asc") return [...list].sort((a, b) => a.quote.totalCents - b.quote.totalCents);
    if (sort === "price-desc") return [...list].sort((a, b) => b.quote.totalCents - a.quote.totalCents);
    return list;
  }, [results.data, sort, maxTotal]);

  return (
    <div className="min-h-dvh bg-white text-neutral-900 [font-family:'Circular',-apple-system,'Segoe_UI',Helvetica,sans-serif]">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white px-10 pb-5 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate({ listing: null })} className="flex items-center gap-1 text-[22px] font-bold tracking-tight text-[#ff385c]">
            <span className="text-[26px]">⌂</span> staybook
          </button>
          <span className="flex items-center gap-4 text-[14px]">
            <button
              type="button"
              className={`font-semibold ${section === "trips" ? "underline underline-offset-8" : ""}`}
              onClick={() => {
                setSection("trips");
                window.history.pushState(null, "", "?section=trips");
              }}
            >
              Trips
            </button>
            <span className="font-semibold">Become a host</span>
            <Globe className="h-4 w-4" />
            <span className="flex items-center gap-3 rounded-full border border-neutral-300 px-3 py-1.5"><Menu className="h-4 w-4" /><UserCircle2 className="h-7 w-7 text-neutral-500" /></span>
          </span>
        </div>
        <SearchBar query={query} onSearch={(q) => navigate({ query: q, listing: null })} />
      </header>
      {section === "trips" ? (
        <TripsPage />
      ) : listingId ? (
        <ListingPage listingId={listingId} query={query} onBack={() => navigate({ listing: null })} />
      ) : (
        <main className="px-10 py-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[15px] font-semibold">
              {results.isPending ? "Searching…" : `${shown.length} stay${shown.length === 1 ? "" : "s"} in ${query.destination || "all destinations"}`}
            </p>
            <div className="flex items-center gap-3 text-[14px]">
              <label className="flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2">
                Max total $
                <input className="w-20 outline-none" inputMode="numeric" placeholder="Any" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value.replace(/\D/g, ""))} />
              </label>
              <select aria-label="Sort" className="rounded-full border border-neutral-300 px-4 py-2" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recommended">Recommended</option>
                <option value="price-asc">Total price: low to high</option>
                <option value="price-desc">Total price: high to low</option>
              </select>
            </div>
          </div>
          {results.isError ? (
            <p role="alert">Search failed. <button className="underline" onClick={() => void results.refetch()}>Try again</button></p>
          ) : results.isPending ? (
            <div className="grid grid-cols-4 gap-6">{Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-neutral-100" />)}</div>
          ) : shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[18px] font-semibold">No exact matches</p>
              <p className="text-neutral-500">Try changing your dates, guests, or price filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-x-6 gap-y-10">
              {shown.map(({ listing, quote }) => <ListingCard key={listing.id} listing={listing} quote={quote} onOpen={() => navigate({ listing: listing.id })} />)}
            </div>
          )}
        </main>
      )}
      <MockControls
        sections={[
          {
            title: "Hosts and other guests",
            actions: [
              { label: "Someone books Nov 13–16 at the Alfama flat", run: () => simulateBooking("l-1", "2026-11-13", 3) },
              { label: "Host raises Alfama flat prices 15%", run: () => simulatePriceChange("l-1", 15) },
            ],
          },
          {
            title: `Host of trip ${seedReservation.id}`,
            actions: [
              { label: "Host approves the pending change", run: () => simulateHostDecision(seedReservation.id, "approved") },
              { label: "Host declines the pending change", run: () => simulateHostDecision(seedReservation.id, "declined") },
              { label: "Host raises prices 10% (from Nov 1)", run: () => simulatePriceChange(seedReservation.listingId, 10, "2026-11-01") },
              { label: "Host shortens the trip by one night", run: () => simulateHostEditsReservation(seedReservation.id) },
            ],
          },
          { title: "Failures", actions: [{ label: "Fail next search", run: failNextSearch }] },
        ]}
        onReset={resetStayData}
      />
    </div>
  );
}
