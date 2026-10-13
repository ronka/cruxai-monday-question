# Agenda — appointment booking windows interview

A Google Calendar–inspired frontend starter for a feature implementation interview. The calendar already has week and month views, event creation and drag-to-reschedule, a time-zone preference, and seeded busy events (including some around the New York DST change on Nov 1, 2026). It supplies time-zone helpers, a busy-interval API, a mock clock, and a control that simulates another visitor booking a slot first. Data persists in browser SQLite. **Appointment schedules and the booking view are the candidate's task and are not implemented.**

Template: **Agenda** (shared with the recurring-events and out-of-office questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Let the calendar owner configure an appointment schedule: **weekly bookable hours** (per weekday, possibly several ranges), **appointment duration**, **minimum notice** (e.g. 4 hours), and **buffers** before/after appointments.
2. Support **date-specific overrides** that replace the normal hours for a date (including "unavailable all day").
3. Build a **booking view** that shows only valid slots, rendered in the **visitor's time zone** (selectable). Slots must not overlap busy events (plus buffers) or violate the minimum notice relative to the mock clock.
4. Handle overnight time-zone differences (a slot on Tuesday for the owner may be Wednesday for the visitor) and **DST boundaries** without offering nonexistent or duplicate slots.
5. On confirmation, **revalidate** the slot against current data. Handle the case where **Another visitor books a slot…** took it first. A successful booking creates an event on the owner's calendar.

Add meaningful tests for slot generation (hours, notice, buffers, overrides, DST, time-zone shifts) and confirmation races.

## What the starter provides

- **Time-zone helpers** — `src/lib/time.ts` (`toWallTime`, `fromWallTime` with DST gap/overlap handling, `offsetMinutes`, date-key arithmetic, `TIME_ZONES`).
- **Busy data** — `getBusyIntervals(from, to)` returns merged busy intervals (declined invitations excluded); `listEvents(from, to)` for details.
- **Competing booking** — `simulateCompetingBooking(startIso, minutes)` (also in **Mock controls → Booking**) inserts a booking without checking availability.
- **Mock clock** — `clock.now()`; advance it in **Mock controls** to test minimum notice.
- **Browser SQLite** — `agendaDb()` in `src/api/agendaApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/agenda/AgendaApp.tsx), [week view](src/components/agenda/WeekView.tsx), [month view](src/components/agenda/MonthView.tsx), [event dialog](src/components/agenda/EventDialog.tsx).
- [Mock API](src/api/agendaApi.ts), [fixtures](src/data/agendaData.ts), [time helpers](src/lib/time.ts).

## Mock API contract

- `listEvents(fromIso, toIso)`, `getBusyIntervals(fromIso, toIso)`, `createEvent(input)`, `updateEvent(id, patch, expectedVersion?)`, `deleteEvent(id)`.
- `simulateCompetingBooking(startIso, minutes)`.
- `subscribeToAgenda(listener)` emits `{ type: "event" | "deleted", eventId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
