# Relay — scheduled messages interview

A Slack-inspired frontend starter for a feature implementation interview. The app already has channels, searchable message history, message sending, per-channel drafts, channel URLs, and simulated live messages. Messages persist in browser SQLite and are timestamped by a controllable mock clock. **Scheduling messages is the candidate's task and is not implemented.**

Template: **Relay** (shared with the threaded-conversations and saved-messages questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. No environment variables, server, account, or backend required.

## Task

Add **Send later** and a scheduled-message list:

1. From the composer, schedule the current draft for a chosen future time. Validate that the time is in the future and show the user's time zone (`currentUserTimeZone`) next to the picker.
2. Add a list of scheduled messages. Users can edit the text, reschedule, cancel, or send immediately.
3. When the mock clock reaches the due time while the app is open, deliver the message **exactly once**.
4. After a reload, deliver overdue messages exactly once. Do not rely on timers running while the browser is closed.
5. A failed delivery (use **Fail next send**) stays recoverable: the user can see it failed and retry or edit it.
6. Define and implement what happens when the user edits or cancels a message while its delivery is already in flight.

Choose and document the data model and state transitions. Add meaningful tests for the scheduling rules and races you handle.

## What the starter provides

- **Mock clock** — `src/mock/clock.ts`. Time moves only when you use the clock buttons in **Mock controls**. Use `clock.now()` and `clock.subscribe()` rather than `Date.now()`. The mock time is saved, so a reload continues from the same time.
- **Browser SQLite** — `src/mock/sqlite.ts`. `chatDb()` in `src/api/chatApi.ts` opens the `relay` database. Add your own tables to `SCHEMA` and bump `version` (this discards saved data). Use `db.transaction()` for multi-statement changes.
- **Send failures** — **Fail next send** makes the next `sendMessage` call reject without storing anything.
- **Time zones** — every member has a `timeZone`; the signed-in user's preference is `currentUserTimeZone`.
- **Reset local data** restores fixtures and the clock.

## Code map

- [Workspace UI](src/components/chat/ChatWorkspace.tsx): channel routing, composer, mock controls.
- [Message list](src/components/chat/MessageList.tsx): flat channel messages.
- [Mock API](src/api/chatApi.ts): SQLite-backed reads and writes with 350 ms latency.
- [Fixtures](src/data/chatData.ts): channels, members, time zones, starting messages.
- [Mock infrastructure](src/mock): clock, SQLite adapter, network faults, controls panel.

## Mock API contract

- `getMessages(channelId)` returns top-level messages in timestamp order.
- `sendMessage({ channelId, body, clientId })` stores and publishes a message stamped with the mock time. Reusing a `clientId` returns the stored message instead of creating a duplicate.
- `subscribeToMessages(listener)` delivers new messages; returns an unsubscribe function.
- `failNextMessageSend()` makes the next new send reject once.
- `resetChatData()` restores fixtures.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
