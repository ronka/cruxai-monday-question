"use client";

import { useQuery } from "@tanstack/react-query";
import { PawPrint, Users } from "lucide-react";
import { getListing, listReservations } from "@/api/stayApi";
import { formatMoney } from "@/data/stayData";
import { formatDay, nightsBetween } from "@/lib/dates";
import type { Reservation } from "@/types/stay";
import { Photo } from "./ListingCard";

function TripCard({ reservation }: { reservation: Reservation }) {
  const listing = useQuery({ queryKey: ["listing", reservation.listingId], queryFn: () => getListing(reservation.listingId) });
  return (
    <article className="grid grid-cols-[1fr_320px] overflow-hidden rounded-2xl border border-neutral-200 shadow-[0_6px_16px_rgba(0,0,0,0.08)]">
      <div className="p-8">
        <p className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-[#008a05]">Confirmed · {reservation.id}</p>
        <h2 className="text-[26px] font-semibold">{listing.data?.city ?? "…"}</h2>
        <p className="mb-6 text-neutral-600">{listing.data?.title} · hosted by {listing.data?.hostName}</p>
        <dl className="grid grid-cols-3 gap-6 border-y border-neutral-200 py-5 text-[15px]">
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Check-in</dt><dd>{formatDay(reservation.checkIn, { weekday: "short", month: "short", day: "numeric" })}</dd></div>
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Checkout</dt><dd>{formatDay(reservation.checkOut, { weekday: "short", month: "short", day: "numeric" })}</dd></div>
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Nights</dt><dd>{nightsBetween(reservation.checkIn, reservation.checkOut)}</dd></div>
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Guests</dt><dd className="flex items-center gap-1"><Users className="h-4 w-4" /> {reservation.guests}</dd></div>
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Pets</dt><dd className="flex items-center gap-1"><PawPrint className="h-4 w-4" /> {reservation.pets}</dd></div>
          <div><dt className="text-[12px] font-semibold uppercase text-neutral-500">Total paid</dt><dd className="font-semibold">{formatMoney(reservation.totalCents)}</dd></div>
        </dl>
        {listing.data && (
          <p className="mt-4 text-[13px] text-neutral-500">
            Sleeps up to {listing.data.maxGuests} · {listing.data.baseGuests} guests included, then {formatMoney(listing.data.extraGuestFeeCents)} per extra guest per night ·{" "}
            {listing.data.maxPets ? `up to ${listing.data.maxPets} pets (${formatMoney(listing.data.petFeeCents)} pet fee)` : "no pets"}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button type="button" disabled title="Not implemented yet" className="rounded-lg border border-neutral-900 px-5 py-2.5 font-semibold opacity-40">Change reservation</button>
          <span className="self-center text-[12px] text-neutral-400">Reservation version {reservation.version}</span>
        </div>
      </div>
      {listing.data && <Photo listing={listing.data} className="h-full min-h-72" />}
    </article>
  );
}

export function TripsPage() {
  const reservations = useQuery({ queryKey: ["reservations"], queryFn: listReservations });
  return (
    <main className="mx-auto max-w-5xl px-10 py-8">
      <h1 className="mb-6 text-[32px] font-semibold">Trips</h1>
      {reservations.isPending ? <p role="status">Loading trips…</p> : reservations.data!.map((r) => <TripCard key={r.id} reservation={r} />)}
    </main>
  );
}
