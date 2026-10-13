"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { DESTINATIONS } from "@/data/stayData";
import type { StayQuery } from "@/types/stay";

/** The pill-shaped search bar: destination, exact dates, and guests. */
export function SearchBar({ query, onSearch }: { query: StayQuery; onSearch: (query: StayQuery) => void }) {
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const cell = "flex flex-col rounded-full px-6 py-2.5 hover:bg-neutral-100";
  const label = "text-[12px] font-semibold text-neutral-800";
  const input = "bg-transparent text-[14px] text-neutral-600 outline-none";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft);
      }}
      className="mx-auto flex w-fit items-center rounded-full border border-neutral-200 bg-white shadow-[0_3px_12px_rgba(0,0,0,0.1)]"
    >
      <label className={cell}>
        <span className={label}>Where</span>
        <input className={`${input} w-40`} list="destinations" placeholder="Search destinations" value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} />
        <datalist id="destinations">{DESTINATIONS.map((d) => <option key={d} value={d} />)}</datalist>
      </label>
      <span className="h-8 w-px bg-neutral-200" />
      <label className={cell}>
        <span className={label}>Check in</span>
        <input className={input} type="date" value={draft.checkIn} onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })} />
      </label>
      <span className="h-8 w-px bg-neutral-200" />
      <label className={cell}>
        <span className={label}>Check out</span>
        <input className={input} type="date" value={draft.checkOut} onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })} />
      </label>
      <span className="h-8 w-px bg-neutral-200" />
      <label className={cell}>
        <span className={label}>Who</span>
        <input className={`${input} w-24`} type="number" min={1} max={16} value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: Math.max(1, Number(e.target.value)) })} />
      </label>
      <button type="submit" aria-label="Search" className="m-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff385c] text-white hover:bg-[#e31c5f]">
        <Search className="h-4 w-4" strokeWidth={3} />
      </button>
    </form>
  );
}
