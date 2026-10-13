# Staybook — shared trip shortlists interview

An Airbnb-inspired frontend starter for a feature implementation interview. The app already has destination and exact-date search, listing cards with nightly and total prices, filters and sort, and listing details with an availability calendar and quote. It supplies **traveler profiles**, **travel groups with editor/viewer roles**, a **signed-in traveler switcher**, mock controls that emit **collaborator actions** (saves, votes, notes), and a control that makes a host **remove a listing**. Data persists in browser SQLite. **Shared wishlists are the candidate's task and are not implemented.**

Template: **Staybook** (shared with the flexible-dates and reservation-change questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add **named trip wishlists** owned by a travel group. Users can save listings, remove them, and write **notes**.
2. Each traveler has **one up/down vote per listing**, and can change or remove it. Show totals and each traveler's vote.
3. Keep **totals and sort order** (e.g. by score) consistent as simulated collaborators act (**Mock controls → Lisbon group**).
4. A wishlist has **trip dates**: changing them refreshes displayed prices and availability for every saved listing while **keeping** saved listings, votes, and notes.
5. A **removed listing** (**Host removes the Tiled townhouse listing**) becomes an informative placeholder instead of breaking the list.
6. **Viewer** and **editor** roles behave differently **through your mock API** (not only in the UI): viewers can see but not change. Switch to *Leo Brandt* to test; the “Leo tries to vote” control must be rejected.

Add meaningful tests for vote semantics, role enforcement, and date changes.

## What the starter provides

- **People and groups** — `listTravelers()`, `listGroups(travelerId)`, `roleIn(groupId, travelerId)`; `travelerId` state in `StayApp` (header select).
- **Collaborators** — `subscribeToCollaborators(listener)` receives `{ groupId, type: "save" | "unsave" | "vote" | "note", travelerId, listingId, … }`. Apply them through your API so the same rules run.
- **Removal** — `simulateListingRemoval(listingId)`; afterwards `getListing` rejects with `ListingRemovedError` and search excludes it.
- **Pricing** — `getQuote(listingId, checkIn, checkOut, guests)`, `getCalendar`, `searchStays`; host price changes and bookings via mock controls.
- **Browser SQLite** — `stayDb()` in `src/api/stayApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/stay/StayApp.tsx), [search bar](src/components/stay/SearchBar.tsx), [listing card](src/components/stay/ListingCard.tsx), [listing page](src/components/stay/ListingPage.tsx).
- [Mock API](src/api/stayApi.ts), [fixtures](src/data/stayData.ts), [types](src/types/stay.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
