/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { getCalendar, getQuote, searchStays, simulateBooking, stayDb } from "@/api/stayApi";
import { addDays, eachNight, nightsBetween } from "@/lib/dates";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await stayDb();
});

test("date helpers", () => {
  expect(nightsBetween("2026-10-30", "2026-11-02")).toBe(3);
  expect(eachNight("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
});

test("quotes include cleaning fees and enforce min nights and capacity", async () => {
  // Find the first bookable 3-night stay (the fixture calendar has booked stretches).
  let checkIn = "2026-11-01";
  let quote = await getQuote("l-2", checkIn, addDays(checkIn, 3), 4);
  while (!quote.ok) {
    checkIn = addDays(checkIn, 1);
    quote = await getQuote("l-2", checkIn, addDays(checkIn, 3), 4);
  }
  const nights = await getCalendar("l-2", checkIn, addDays(checkIn, 3));
  expect(quote.quote.totalCents).toBe(nights.reduce((s, d) => s + d.priceCents, 0) + 9000);
  expect(await getQuote("l-2", "2026-11-10", "2026-11-11", 2)).toEqual({ ok: false, quote: null, reason: "Minimum stay is 3 nights" });
  expect(await getQuote("l-3", "2026-11-10", "2026-11-12", 3)).toEqual({ ok: false, quote: null, reason: "Sleeps up to 2" });
});

test("exact search excludes listings with an unavailable night", async () => {
  const query = { destination: "Lisbon", checkIn: "2026-11-13", checkOut: "2026-11-16", guests: 2 };
  const before = await searchStays(query);
  await simulateBooking("l-1", "2026-11-14", 1);
  const after = await searchStays(query);
  expect(after.some((r) => r.listing.id === "l-1")).toBe(false);
  expect(after.length).toBe(before.filter((r) => r.listing.id !== "l-1").length);
});

test("groups, roles, collaborator events and listing removal", async () => {
  const { getListing, listGroups, ListingRemovedError, roleIn, simulateCollaboratorAction, simulateListingRemoval, subscribeToCollaborators } = await import("@/api/stayApi");
  expect((await listGroups("sam")).map((g) => g.id)).toEqual(["g-lisbon", "g-kyoto"]);
  expect(roleIn("g-lisbon", "leo")).toBe("viewer");
  expect(roleIn("g-kyoto", "priya")).toBeNull();
  const seen: unknown[] = [];
  const unsubscribe = subscribeToCollaborators((event) => seen.push(event));
  simulateCollaboratorAction("g-lisbon", { type: "vote", travelerId: "ana", listingId: "l-1", value: -1 });
  unsubscribe();
  expect(seen).toEqual([{ groupId: "g-lisbon", type: "vote", travelerId: "ana", listingId: "l-1", value: -1 }]);
  await simulateListingRemoval("l-2");
  await expect(getListing("l-2")).rejects.toBeInstanceOf(ListingRemovedError);
});
