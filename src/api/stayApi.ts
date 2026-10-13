import { CALENDAR_END, CALENDAR_START, groups, seedListings, travelers } from "@/data/stayData";
import { addDays, eachNight, nightsBetween } from "@/lib/dates";
import { createEmitter } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { CalendarDay, CollaboratorAction, GroupRole, Listing, QuoteResult, SearchResult, StayQuery, Traveler, TravelGroup } from "@/types/stay";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE listings (id TEXT PRIMARY KEY, data TEXT NOT NULL, removed_at TEXT);
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
        db.run("INSERT INTO listings VALUES (?, ?, NULL)", [listing.id, JSON.stringify(listing)]);
        for (let date = CALENDAR_START; date < CALENDAR_END; date = addDays(date, 1)) {
          const day = new Date(`${date}T00:00:00Z`).getUTCDay();
          const weekend = day === 5 || day === 6 ? 1.25 : 1;
          const holiday = date >= "2026-12-20" && date <= "2027-01-03" ? 1.4 : 1;
          const jitter = 0.9 + noise(`${listing.id}${date}p`) * 0.2;
          const price = Math.round((baseNightlyCents * weekend * holiday * jitter) / 100) * 100;
          // Booked stretches of 2–4 nights appear in roughly a quarter of weeks.
          const week = Math.floor(nightsBetween(CALENDAR_START, date) / 7);
          const booked = noise(`${listing.id}w${week}`) < 0.27 && day >= Math.floor(noise(`${listing.id}s${week}`) * 4) && day <= 3 + Math.floor(noise(`${listing.id}e${week}`) * 3);
          db.run("INSERT INTO calendar VALUES (?, ?, ?, ?)", [listing.id, date, booked ? 0 : 1, price]);
        }
      }
    },
  });
}

const events = createEmitter<{ type: "calendar"; listingId: string }>();
/** Emitted when availability or prices change (e.g. through mock controls). */
export const subscribeToStays = events.subscribe;

export class ListingRemovedError extends Error {
  constructor(readonly listingId: string, readonly title: string) {
    super(`“${title}” is no longer listed`);
    this.name = "ListingRemovedError";
  }
}

function readListing(db: LocalDatabase, id: string): Listing {
  const row = db.get<{ data: string; removed_at: string | null }>("SELECT data, removed_at FROM listings WHERE id = ?", [id]);
  if (!row) throw new Error("Listing not found");
  const listing = JSON.parse(row.data) as Listing;
  if (row.removed_at) throw new ListingRemovedError(id, listing.title);
  return listing;
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
    const listings = db.all<{ data: string }>("SELECT data FROM listings WHERE removed_at IS NULL").map((row) => JSON.parse(row.data) as Listing);
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
      .all<{ data: string }>("SELECT data FROM listings WHERE removed_at IS NULL")
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
  db.run("UPDATE calendar SET price_cents = CAST(ROUND(price_cents * (100 + ?) / 100.0 / 100) * 100 AS INTEGER) WHERE listing_id = ? AND date >= ?", [percent, listingId, from]);
  events.emit({ type: "calendar", listingId });
}

export async function listTravelers(): Promise<Traveler[]> {
  return simulate("listTravelers", () => travelers);
}

/** Groups the traveler belongs to. */
export async function listGroups(travelerId: string): Promise<TravelGroup[]> {
  return simulate("listGroups", () => groups.filter((group) => group.members.some((m) => m.travelerId === travelerId)));
}

/** The traveler's role in a group, or null if not a member. Use it to enforce permissions in your API. */
export function roleIn(groupId: string, travelerId: string): GroupRole | null {
  return groups.find((group) => group.id === groupId)?.members.find((m) => m.travelerId === travelerId)?.role ?? null;
}

/** Mock control: the host removes a listing. Later reads reject with ListingRemovedError. */
export async function simulateListingRemoval(listingId: string): Promise<void> {
  const db = await stayDb();
  readListing(db, listingId);
  db.run("UPDATE listings SET removed_at = datetime('now') WHERE id = ?", [listingId]);
  events.emit({ type: "calendar", listingId });
}

const collaborators = createEmitter<CollaboratorAction & { groupId: string }>();
/** Actions by other travelers (from the mock controls). Apply them through your wishlist API. */
export const subscribeToCollaborators = collaborators.subscribe;
export function simulateCollaboratorAction(groupId: string, action: CollaboratorAction): void {
  collaborators.emit({ ...action, groupId });
}

export function failNextSearch(): void {
  network.failNext("searchStays");
}

export async function resetStayData(): Promise<void> {
  await (await stayDb()).reset();
}
