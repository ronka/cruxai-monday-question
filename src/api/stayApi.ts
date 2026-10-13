import { CALENDAR_END, CALENDAR_START, seedListings, seedReservation } from "@/data/stayData";
import { clock } from "@/mock/clock";
import { addDays, eachNight, nightsBetween } from "@/lib/dates";
import { createEmitter } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { CalendarDay, ChangeQuote, HostDecision, Listing, QuoteResult, Reservation, SearchResult, StayQuery } from "@/types/stay";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE listings (id TEXT PRIMARY KEY, data TEXT NOT NULL, pricing_version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL,
  pets INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE calendar (
  listing_id TEXT NOT NULL,
  date TEXT NOT NULL,
  available INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  PRIMARY KEY (listing_id, date)
);
`;

/** Deterministic pseudo-random in [0, 1) for a string. */
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

export function stayDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "staybook",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      for (const { baseNightlyCents, ...listing } of seedListings) {
        db.run("INSERT INTO listings VALUES (?, ?, 1)", [listing.id, JSON.stringify(listing)]);
        for (let date = CALENDAR_START; date < CALENDAR_END; date = addDays(date, 1)) {
          const day = new Date(`${date}T00:00:00Z`).getUTCDay();
          const weekend = day === 5 || day === 6 ? 1.25 : 1;
          const holiday = date >= "2026-12-20" && date <= "2027-01-03" ? 1.4 : 1;
          const jitter = 0.9 + noise(`${listing.id}${date}p`) * 0.2;
          const price = Math.round((baseNightlyCents * weekend * holiday * jitter) / 100) * 100;
          // Booked stretches of 2–4 nights appear in roughly a quarter of weeks.
          const week = Math.floor(nightsBetween(CALENDAR_START, date) / 7);
          const booked = noise(`${listing.id}w${week}`) < 0.27 && day >= Math.floor(noise(`${listing.id}s${week}`) * 4) && day <= 3 + Math.floor(noise(`${listing.id}e${week}`) * 3);
          const reserved = listing.id === seedReservation.listingId && date >= seedReservation.checkIn && date < seedReservation.checkOut;
          db.run("INSERT INTO calendar VALUES (?, ?, ?, ?)", [listing.id, date, booked || reserved ? 0 : 1, price]);
        }
      }
      const r = seedReservation;
      const listing = seedListings.find((l) => l.id === r.listingId)!;
      const { total } = db.get<{ total: number }>("SELECT SUM(price_cents) AS total FROM calendar WHERE listing_id = ? AND date >= ? AND date < ?", [r.listingId, r.checkIn, r.checkOut])!;
      db.run("INSERT INTO reservations VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', 1, ?)", [r.id, r.listingId, r.checkIn, r.checkOut, r.guests, r.pets, total + listing.cleaningFeeCents, clock.date().toISOString()]);
    },
  });
}

const events = createEmitter<{ type: "calendar"; listingId: string }>();
/** Emitted when availability or prices change (e.g. through mock controls). */
export const subscribeToStays = events.subscribe;

function readListing(db: LocalDatabase, id: string): Listing {
  const row = db.get<{ data: string }>("SELECT data FROM listings WHERE id = ?", [id]);
  if (!row) throw new Error("Listing not found");
  return JSON.parse(row.data);
}

function calendar(db: LocalDatabase, listingId: string, from: string, to: string): CalendarDay[] {
  return db
    .all<{ date: string; available: number; price_cents: number }>(
      "SELECT date, available, price_cents FROM calendar WHERE listing_id = ? AND date >= ? AND date < ? ORDER BY date",
      [listingId, from, to],
    )
    .map((row) => ({ date: row.date, available: row.available === 1, priceCents: row.price_cents }));
}

/** Prices a stay. Fails with a reason when the stay is not bookable. */
export function quoteStay(db: LocalDatabase, listing: Listing, checkIn: string, checkOut: string, guests: number): QuoteResult {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return { ok: false, quote: null, reason: "Check-out must be after check-in" };
  if (guests > listing.maxGuests) return { ok: false, quote: null, reason: `Sleeps up to ${listing.maxGuests}` };
  if (nights < listing.minNights) return { ok: false, quote: null, reason: `Minimum stay is ${listing.minNights} nights` };
  const days = calendar(db, listing.id, checkIn, checkOut);
  if (days.length !== nights) return { ok: false, quote: null, reason: "Dates are outside the bookable calendar" };
  if (days.some((day) => !day.available)) return { ok: false, quote: null, reason: "Some nights are unavailable" };
  const nightlyCents = days.map((day) => day.priceCents);
  const subtotalCents = nightlyCents.reduce((sum, cents) => sum + cents, 0);
  return {
    ok: true,
    reason: null,
    quote: { listingId: listing.id, checkIn, checkOut, nights, nightlyCents, subtotalCents, cleaningFeeCents: listing.cleaningFeeCents, totalCents: subtotalCents + listing.cleaningFeeCents },
  };
}

/** Listings in `destination` that can be booked for exactly these dates and guests. */
export async function searchStays(query: StayQuery): Promise<SearchResult[]> {
  const db = await stayDb();
  return simulate("searchStays", () => {
    const listings = db.all<{ data: string }>("SELECT data FROM listings").map((row) => JSON.parse(row.data) as Listing);
    return listings
      .filter((listing) => !query.destination || listing.city.toLowerCase() === query.destination.trim().toLowerCase())
      .flatMap((listing) => {
        const result = quoteStay(db, listing, query.checkIn, query.checkOut, query.guests);
        return result.ok ? [{ listing, quote: result.quote }] : [];
      });
  });
}

export async function listListings(destination?: string): Promise<Listing[]> {
  const db = await stayDb();
  return simulate("listListings", () =>
    db
      .all<{ data: string }>("SELECT data FROM listings")
      .map((row) => JSON.parse(row.data) as Listing)
      .filter((listing) => !destination || listing.city.toLowerCase() === destination.toLowerCase()),
  );
}

export async function getListing(id: string): Promise<Listing> {
  const db = await stayDb();
  return simulate("getListing", () => readListing(db, id));
}

/** Nightly availability and prices for [from, to). */
export async function getCalendar(listingId: string, from: string, to: string): Promise<CalendarDay[]> {
  const db = await stayDb();
  return simulate("getCalendar", () => {
    readListing(db, listingId);
    return calendar(db, listingId, from, to);
  });
}

/** Re-prices a stay against current availability (use before confirming). */
export async function getQuote(listingId: string, checkIn: string, checkOut: string, guests: number): Promise<QuoteResult> {
  const db = await stayDb();
  return simulate("getQuote", () => quoteStay(db, readListing(db, listingId), checkIn, checkOut, guests));
}

/** Mock control: someone books nights at a listing, making them unavailable. */
export async function simulateBooking(listingId: string, checkIn: string, nights: number): Promise<void> {
  const db = await stayDb();
  for (const date of eachNight(checkIn, addDays(checkIn, nights))) db.run("UPDATE calendar SET available = 0 WHERE listing_id = ? AND date = ?", [listingId, date]);
  events.emit({ type: "calendar", listingId });
}

/** Mock control: a host raises (or lowers) every price from `from` onward by `percent`. */
export async function simulatePriceChange(listingId: string, percent: number, from = CALENDAR_START): Promise<void> {
  const db = await stayDb();
  db.transaction(() => {
    db.run("UPDATE calendar SET price_cents = CAST(ROUND(price_cents * (100 + ?) / 100.0 / 100) * 100 AS INTEGER) WHERE listing_id = ? AND date >= ?", [percent, listingId, from]);
    db.run("UPDATE listings SET pricing_version = pricing_version + 1 WHERE id = ?", [listingId]);
  });
  events.emit({ type: "calendar", listingId });
}

type ReservationRow = { id: string; listing_id: string; check_in: string; check_out: string; guests: number; pets: number; total_cents: number; status: Reservation["status"]; version: number; updated_at: string };
const toReservation = (row: ReservationRow): Reservation => ({
  id: row.id,
  listingId: row.listing_id,
  checkIn: row.check_in,
  checkOut: row.check_out,
  guests: row.guests,
  pets: row.pets,
  totalCents: row.total_cents,
  status: row.status,
  version: row.version,
  updatedAt: row.updated_at,
});
function readReservation(db: LocalDatabase, id: string): Reservation {
  const row = db.get<ReservationRow>("SELECT * FROM reservations WHERE id = ?", [id]);
  if (!row) throw new Error("Reservation not found");
  return toReservation(row);
}

export async function listReservations(): Promise<Reservation[]> {
  const db = await stayDb();
  return simulate("listReservations", () => db.all<ReservationRow>("SELECT * FROM reservations ORDER BY check_in").map(toReservation));
}

export async function getReservation(id: string): Promise<Reservation> {
  const db = await stayDb();
  return simulate("getReservation", () => readReservation(db, id));
}

/**
 * Prices changing an existing reservation to `guests`/`pets` using current
 * nightly prices. Rejects when the change violates capacity or pet rules.
 * The reservation's own nights count as available.
 */
export async function quoteReservationChange(reservationId: string, change: { guests: number; pets: number }): Promise<ChangeQuote> {
  const db = await stayDb();
  return simulate("quoteReservationChange", () => {
    const reservation = readReservation(db, reservationId);
    if (reservation.status !== "confirmed") throw new Error("Only confirmed reservations can change");
    const listing = readListing(db, reservation.listingId);
    if (!Number.isInteger(change.guests) || change.guests < 1) throw new Error("At least one guest is required");
    if (change.guests > listing.maxGuests) throw new Error(`This place sleeps up to ${listing.maxGuests}`);
    if (change.pets > listing.maxPets) throw new Error(listing.maxPets ? `Up to ${listing.maxPets} pets allowed` : "Pets are not allowed");
    const nights = calendar(db, listing.id, reservation.checkIn, reservation.checkOut).map((day) => day.priceCents);
    const extraGuests = Math.max(0, change.guests - listing.baseGuests);
    const extraGuestCents = extraGuests * listing.extraGuestFeeCents * nights.length;
    const petFeeCents = change.pets > 0 ? listing.petFeeCents : 0;
    const newTotalCents = nights.reduce((s, c) => s + c, 0) + extraGuestCents + petFeeCents + listing.cleaningFeeCents;
    const { pricing_version } = db.get<{ pricing_version: number }>("SELECT pricing_version FROM listings WHERE id = ?", [listing.id])!;
    return {
      reservationId,
      reservationVersion: reservation.version,
      pricingVersion: pricing_version,
      guests: change.guests,
      pets: change.pets,
      nightlyCents: nights,
      extraGuestCents,
      petFeeCents,
      cleaningFeeCents: listing.cleaningFeeCents,
      newTotalCents,
      originalTotalCents: reservation.totalCents,
      differenceCents: newTotalCents - reservation.totalCents,
    };
  });
}

/** Current pricing version for a listing (increments on any price change). */
export async function getPricingVersion(listingId: string): Promise<number> {
  const db = await stayDb();
  return db.get<{ pricing_version: number }>("SELECT pricing_version FROM listings WHERE id = ?", [listingId])!.pricing_version;
}

/**
 * Applies an approved change to the confirmed reservation. Use only after host
 * approval. Rejects if `expectedVersion` is stale.
 */
export async function applyReservationChange(id: string, change: { guests: number; pets: number; totalCents: number }, expectedVersion: number): Promise<Reservation> {
  const db = await stayDb();
  return simulate("applyReservationChange", () => {
    const current = readReservation(db, id);
    if (current.version !== expectedVersion) throw new Error("The reservation changed since this request was made");
    db.run("UPDATE reservations SET guests = ?, pets = ?, total_cents = ?, version = version + 1, updated_at = ? WHERE id = ?", [change.guests, change.pets, change.totalCents, clock.date().toISOString(), id]);
    events.emit({ type: "calendar", listingId: current.listingId });
    return readReservation(db, id);
  });
}

/** Mock control: the host shortens the trip by one night (bumps the reservation version). */
export async function simulateHostEditsReservation(id: string): Promise<Reservation> {
  const db = await stayDb();
  const current = readReservation(db, id);
  const lastNight = addDays(current.checkOut, -1);
  const { price_cents } = db.get<{ price_cents: number }>("SELECT price_cents FROM calendar WHERE listing_id = ? AND date = ?", [current.listingId, lastNight])!;
  db.transaction(() => {
    db.run("UPDATE calendar SET available = 1 WHERE listing_id = ? AND date = ?", [current.listingId, lastNight]);
    db.run("UPDATE reservations SET check_out = ?, total_cents = total_cents - ?, version = version + 1, updated_at = ? WHERE id = ?", [lastNight, price_cents, clock.date().toISOString(), id]);
  });
  events.emit({ type: "calendar", listingId: current.listingId });
  return readReservation(db, id);
}

const host = createEmitter<HostDecision>();
/** Host decisions from the mock controls. Apply them to your change requests. */
export const subscribeToHostDecisions = host.subscribe;
export function simulateHostDecision(reservationId: string, decision: HostDecision["decision"]): void {
  host.emit({ type: "decision", reservationId, decision });
}

export function failNextSearch(): void {
  network.failNext("searchStays");
}

export async function resetStayData(): Promise<void> {
  await (await stayDb()).reset();
  clock.reset();
}
