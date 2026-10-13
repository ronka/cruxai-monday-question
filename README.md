# Helpdesk — snooze and automatic reopening interview

An Intercom-inspired frontend starter for a feature implementation interview. The inbox already has **Open** and **Closed** views with counts, per-agent unread indicators, threads with replies and **internal notes**, close/reopen, a customer panel, an agent switcher, and a read-only **assignee** on each conversation. It supplies a **controllable clock**, mock controls for **incoming customer replies** and teammate notes, and persistent conversation records. Data persists in browser SQLite. **Snoozing is the candidate's task and is not implemented.**

Template: **Helpdesk** (shared with the assignment and reply-macros questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add **preset** snooze times (e.g. later today, tomorrow 9:00, next week) and a **custom** time, plus a **Snoozed** inbox with a count.
2. Snoozing removes a conversation from **Open** while **preserving its assignee**.
3. **Reopen** when the snooze time passes (mock clock) **or** when the customer replies. **Internal notes do not reopen** it in this exercise.
4. **Rescheduling** invalidates the old timer — the old time must not reopen it.
5. If both triggers happen together (a customer reply at the due time), reopen **once** (one history entry, one count change).
6. On **reload**, reconcile snoozes that expired while the app was closed and update counts **without displacing the conversation being read**.

Add meaningful tests for timers, rescheduling, simultaneous triggers, and reconciliation.

## What the starter provides

- **Mock clock** — `src/mock/clock.ts`; buttons in **Mock controls**. Use `clock.now()` / `clock.subscribe()` (or `useMockClock()`) instead of `Date.now()`. The mock time is saved, so a reload continues from the same time.
- **Notes** — `addNote({ conversationId, agentId, body, clientId })`; messages have `kind: "customer" | "agent" | "note"`. Notes never change the preview or unread state.
- **Assignee** — `Conversation.assigneeId` (seeded; shown in the thread header).
- **Mock controls** — new conversation, customer replies (this reopens a *closed* conversation today), Marcus replies, Sana adds a note, fail next reply, reset local data.
- **Browser SQLite** — `helpdeskDb()` in `src/api/helpdeskApi.ts`. Add tables or columns to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [Inbox UI](src/components/helpdesk/HelpdeskApp.tsx), [mock API](src/api/helpdeskApi.ts), [fixtures](src/data/helpdeskData.ts), [types](src/types/helpdesk.ts).

## Mock API contract

- `listConversations(status, agentId)`, `countConversations()`, `getConversation(id, agentId)`, `getMessages(id)`.
- `sendReply(input)`, `addNote(input)` (idempotent by `clientId`), `setStatus(id, status, agentId)`, `markRead(id, agentId)`.
- `subscribeToHelpdesk(listener)` emits `{ type: "message" | "conversation", conversationId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
