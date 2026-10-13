# Agenda — out-of-office conflict handling interview

A Google Calendar–inspired frontend starter for a feature implementation interview. The calendar already has week and month views, event creation and drag-to-reschedule, a time-zone preference, and **invitations** from other people with the owner's local responses (Yes / No / Maybe, shown with Google-style outline and strike-through styles). A mock control delivers new invitations. Responses are local records — nothing is emailed. Data persists in browser SQLite. **Out-of-office blocks are the candidate's task and are not implemented.**

Template: **Agenda** (shared with the recurring-events and appointment-booking questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002/?view=week&date=2026-10-19 to see next week's invitations.

## Task

1. Add an **out-of-office** event (timed or all-day, possibly multi-day) with a choice: **decline only new invitations**, or **also decline existing meetings** in the period.
2. Before applying, **preview** the affected meetings and what will happen to each.
3. Evaluate conflicts in the **calendar owner's time zone**, including **partial overlaps**, events that span midnight, and all-day blocks.
4. New conflicting invitations (use **Receive a new invitation**) receive a simulated **decline** automatically.
5. Editing or deleting the out-of-office block recalculates future behavior but must **not silently re-accept** invitations that were already declined. Define what happens to invitations that no longer conflict.
6. Record every automatic action (decline, skipped, conflict detected) in a local **activity history** the owner can review.

Add meaningful tests for overlap evaluation, the decline policies, and edits/deletes of the block.

## What the starter provides

- **Invitations** — events whose `organizer` is not the owner (`OWNER` in `src/data/agendaData.ts`). Next week includes accepted, tentative, awaiting, and declined invitations, plus a late-night one that crosses midnight.
- **Responses** — `respondToInvitation(eventId, "accepted" | "declined" | "tentative")`; `listInvitations(from, to)`.
- **Incoming invitations** — `simulateIncomingInvitation()` (also in **Mock controls → Invitations**) cycles through: a short meeting, a long afternoon block, an all-day event, one spanning midnight, and one the following week.
- **Time-zone helpers** — `src/lib/time.ts`. Mock clock in **Mock controls**.
- **Browser SQLite** — `agendaDb()` in `src/api/agendaApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/agenda/AgendaApp.tsx), [week view](src/components/agenda/WeekView.tsx), [month view](src/components/agenda/MonthView.tsx), [event dialog with RSVP](src/components/agenda/EventDialog.tsx).
- [Mock API](src/api/agendaApi.ts), [fixtures](src/data/agendaData.ts), [time helpers](src/lib/time.ts).

## Mock API contract

- `listEvents(fromIso, toIso)`, `listInvitations(fromIso, toIso)`, `createEvent`, `updateEvent(id, patch, expectedVersion?)`, `deleteEvent`.
- `respondToInvitation(eventId, response)`, `simulateIncomingInvitation()`.
- `subscribeToAgenda(listener)` emits `{ type: "event" | "deleted", eventId }` — including for incoming invitations.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
