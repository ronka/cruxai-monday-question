# Staybook — reservation change requests interview

An Airbnb-inspired frontend starter for a feature implementation interview. The app already has stays search, listing details with an availability calendar and quote, and a **Trips** page showing the guest's confirmed reservation (`r-7Q4K`, Tiled townhouse in Lisbon, Nov 20–24, 2 guests, no pets). It supplies **capacity and pet limits**, **mock price quotes** for changing guests/pets (extra-guest and pet fees at current nightly prices), version tracking for reservations and pricing, and **host approve/decline** controls. No payment provider is involved. Data persists in browser SQLite. **Change requests are the candidate's task and are not implemented.**

Template: **Staybook** (shared with the flexible-dates and shared-shortlists questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002/?section=trips.

## Task

1. Let the guest **request a change** to the guest count or number of pets.
2. Before submitting, show the **original and proposed** details with the **quoted price difference** (and the breakdown).
3. Keep the **confirmed reservation unchanged** until the host approves. Apply the change only on approval.
4. Support request states **pending**, **approved**, **declined**, and **withdrawn** (by the guest). Prevent **duplicate submissions** (double-click, retry, a second request while one is pending).
5. If **pricing** (host raises prices) or the **reservation** (host shortens the trip) changes before approval, do not apply a stale quote: require a **refreshed preview** and explicit **reconfirmation** from the guest.

Add meaningful tests for the state machine, duplicate prevention, and stale-quote handling.

## What the starter provides

- **Reservation** — `listReservations()`, `getReservation(id)` (with `version`).
- **Quotes** — `quoteReservationChange(id, { guests, pets })` → `ChangeQuote` with `reservationVersion`, `pricingVersion`, breakdown, and `differenceCents`; rejects on capacity/pet rules. `getPricingVersion(listingId)`.
- **Applying** — `applyReservationChange(id, { guests, pets, totalCents }, expectedVersion)` rejects if the reservation changed.
- **Host** — `subscribeToHostDecisions(listener)` receives `{ type: "decision", reservationId, decision }` from **Mock controls → Host of trip**. Other controls raise prices or shorten the trip.
- **Browser SQLite** — `stayDb()` in `src/api/stayApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/stay/StayApp.tsx), [Trips page](src/components/stay/TripsPage.tsx), [listing page](src/components/stay/ListingPage.tsx).
- [Mock API](src/api/stayApi.ts), [fixtures](src/data/stayData.ts), [types](src/types/stay.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
