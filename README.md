# Agenda — recurring events interview

A Google Calendar–inspired frontend starter for a feature implementation interview. The calendar already has week and month views, click-to-create, an event dialog, drag-to-reschedule with optimistic updates, a saved time-zone preference, and an events API that returns events overlapping a date range. Data persists in browser SQLite. **Recurring events are the candidate's task and are not implemented.**

Template: **Agenda** (shared with the appointment-booking and out-of-office questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. URLs look like `?view=week&date=2026-10-13`.

## Task

1. Create **weekly** recurring events on selected weekdays (e.g. Mon/Wed/Fri), with an optional end date.
2. Edit or delete **this occurrence**, **all occurrences**, or **this and following occurrences** — from the dialog and when dragging an occurrence.
3. Individual exceptions (a moved or deleted occurrence) stay correct after the series is later updated. Define what happens to an exception when the series time or weekdays change.
4. Occurrences stay at their intended **local wall time** across daylight-saving changes (e.g. 9:30 in New York before and after Nov 1, 2026), including when viewed from another time zone.
5. Calendar queries return only occurrences **within the requested range** — never expand an unbounded series.

Add meaningful tests for expansion, exceptions, splits ("this and following"), and DST.

## What the starter provides

- **Time-zone helpers** — `src/lib/time.ts`: `toWallTime`, `fromWallTime` (handles DST gaps and overlaps), `offsetMinutes`, date-key arithmetic (`addDays`, `startOfWeek`, `weekday`). Tested in `tests/time.spec.ts`.
- **Events** — store UTC instants plus the `timeZone` they were created in. `listEvents(from, to)` returns events overlapping `[from, to)`.
- **Optimistic concurrency** — `updateEvent(id, patch, expectedVersion)` rejects with `EventConflictError`.
- **Mock controls** — clock, another device moves an event, fail next update, reset local data.
- **Browser SQLite** — `agendaDb()` in `src/api/agendaApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/agenda/AgendaApp.tsx): navigation, range queries, optimistic moves, dialog, mock controls.
- [Week view](src/components/agenda/WeekView.tsx) (supplied: layout, drag), [month view](src/components/agenda/MonthView.tsx), [event dialog](src/components/agenda/EventDialog.tsx).
- [Mock API](src/api/agendaApi.ts), [fixtures](src/data/agendaData.ts), [types](src/types/agenda.ts), [time helpers](src/lib/time.ts).

## Mock API contract

- `listEvents(fromIso, toIso)`, `getEvent(id)`, `createEvent(input)`, `updateEvent(id, patch, expectedVersion?)`, `deleteEvent(id)`.
- `getTimeZonePreference()`, `setTimeZonePreference(zone)`.
- `subscribeToAgenda(listener)` emits `{ type: "event" | "deleted", eventId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
