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

test("change quotes price extra guests and pets and track versions", async () => {
  const { applyReservationChange, getReservation, quoteReservationChange, simulateHostEditsReservation } = await import("@/api/stayApi");
  const reservation = await getReservation("r-7Q4K");
  const same = await quoteReservationChange(reservation.id, { guests: 2, pets: 0 });
  expect(same.differenceCents).toBe(0);
  const bigger = await quoteReservationChange(reservation.id, { guests: 4, pets: 1 });
  expect(bigger.extraGuestCents).toBe(2 * 2500 * 4);
  expect(bigger.differenceCents).toBe(2 * 2500 * 4 + 4000);
  await expect(quoteReservationChange(reservation.id, { guests: 7, pets: 0 })).rejects.toThrow("sleeps up to 6");
  await expect(quoteReservationChange(reservation.id, { guests: 2, pets: 3 })).rejects.toThrow("Up to 2 pets");
  await simulateHostEditsReservation(reservation.id);
  await expect(applyReservationChange(reservation.id, { guests: 4, pets: 1, totalCents: bigger.newTotalCents }, reservation.version)).rejects.toThrow("changed since");
});
