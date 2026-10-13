# Staybook — flexible-date search interview

An Airbnb-inspired frontend starter for a feature implementation interview. The app already has destination search with **exact** check-in/check-out dates and guest count, listing cards showing nightly and total price, a total-price filter and sort, URL state, and a listing-details page with an availability calendar and a priced booking card. Seeded nightly prices and availability come from the mock API; quotes include **cleaning fees**, **minimum stays**, and **capacity**. Data persists in browser SQLite. **Flexible-date search is the candidate's task and is not implemented.**

Template: **Staybook** (shared with the shared-shortlists and reservation-change questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002 (defaults to Lisbon, Nov 13–16, 2 guests).

## Task

1. Add a **“± 3 days”** option that searches stays starting up to three days before or after the selected check-in while **preserving the trip length**.
2. Each result shows its **cheapest available stay** and the corresponding dates. Define tie-breaking.
3. Prices include **cleaning fees** and respect **minimum-stay** and **capacity** rules (the existing quote rules).
4. The total-price **filter and sort** use the selected stay's **actual total**, not the original dates' price.
5. Preserve the flexible option in the **URL** (including back/forward).
6. When a user opens a result, show the chosen dates on the listing page and **recheck availability** — handle a stay that became unavailable or changed price (see mock controls).

Add meaningful tests for candidate-window generation, cheapest-stay selection, and filter/sort behavior.

## What the starter provides

- **Quotes** — `getQuote(listingId, checkIn, checkOut, guests)` returns `{ ok, quote, reason }`; `quoteStay(db, listing, …)` is the shared pricing rule. `getCalendar(listingId, from, to)` returns nightly availability and prices.
- **Exact search** — `searchStays({ destination, checkIn, checkOut, guests })`; `listListings(destination?)`.
- **Dates** — `src/lib/dates.ts` (`addDays`, `nightsBetween`, `eachNight`, `isDateKey`, `formatDay`). The calendar covers Oct 2026 – Feb 2027, with weekend and holiday pricing and booked stretches.
- **Mock controls** — someone books nights at a listing, a host raises prices, fail the next search, reset local data.
- **Browser SQLite** — `stayDb()` in `src/api/stayApi.ts`.

## Code map

- [App shell](src/components/stay/StayApp.tsx): URL state, results, filter and sort, mock controls.
- [Search bar](src/components/stay/SearchBar.tsx), [listing card](src/components/stay/ListingCard.tsx), [listing page](src/components/stay/ListingPage.tsx).
- [Mock API](src/api/stayApi.ts), [fixtures](src/data/stayData.ts), [types](src/types/stay.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
