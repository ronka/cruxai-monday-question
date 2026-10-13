# Relay — saved messages and reminders interview

A Slack-inspired frontend starter for a feature implementation interview. The app already has channels, searchable message history, message sending, per-channel drafts, channel URLs, and simulated live messages. Messages persist in browser SQLite and are timestamped by a controllable mock clock. **Saving messages and reminders are the candidate's task and are not implemented.**

Template: **Relay** (shared with the threaded-conversations and scheduled-messages questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. No environment variables, server, account, or backend required.

## Task

Let users save messages for later and set reminders:

1. Save any channel message. Saving the same message twice must not create a duplicate item. Saved items are private to the current user.
2. Attach, change, or remove a reminder time on a saved item, and mark items complete.
3. Build **Pending** and **Completed** views. Show an overdue indicator on pending items whose reminder time has passed.
4. When the mock clock reaches a reminder, produce exactly **one** in-app notification. The notification can be snoozed, which schedules a new single notification.
5. After a reload, reminders that became due while the app was closed produce one notification each — not one per reload.
6. Jumping to a saved item opens the correct channel and scrolls to (and highlights) the message.
7. If the source message is deleted, the saved item stays in the list with a clear "message deleted" state and does not break navigation.

Choose and document the data model. Add meaningful tests for reminder delivery, reconciliation, and deleted messages.

## What the starter provides

- **Message IDs** — every message has a stable `id`; each rendered message has the DOM id `message-<id>`. Channels are addressable with `?channel=<id>`.
- **Mock clock** — `src/mock/clock.ts`. Time moves only when you use the clock buttons in **Mock controls**. Use `clock.now()` and `clock.subscribe()` rather than `Date.now()`. The mock time is saved, so a reload continues from the same time.
- **Browser SQLite** — `src/mock/sqlite.ts`. `chatDb()` in `src/api/chatApi.ts` opens the `relay` database. Add your own tables to `SCHEMA` and bump `version` (this discards saved data). Use `db.transaction()` for multi-statement changes.
- **Deleted messages** — **Mock controls → Delete newest message in this channel** or **Delete a message by ID…** simulate another member deleting a message.
- **Reset local data** restores fixtures and the clock.

## Code map

- [Workspace UI](src/components/chat/ChatWorkspace.tsx): channel routing, composer, mock controls.
- [Message list](src/components/chat/MessageList.tsx): flat channel messages.
- [Mock API](src/api/chatApi.ts): SQLite-backed reads and writes with 350 ms latency.
- [Fixtures](src/data/chatData.ts): channels, members, starting messages.
- [Mock infrastructure](src/mock): clock, SQLite adapter, network faults, controls panel.

## Mock API contract

- `getMessages(channelId)` returns top-level messages in timestamp order.
- `getMessage(id)` returns one message or rejects with `Message not found`.
- `sendMessage({ channelId, body, clientId })` stores and publishes a message stamped with the mock time. Reusing a `clientId` returns the stored message.
- `subscribeToMessages(listener)` delivers new messages; `subscribeToDeletes(listener)` delivers deleted message IDs. Both return an unsubscribe function.
- `deleteMessage(id)` deletes a message and its replies (mock control).
- `resetChatData()` restores fixtures.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
