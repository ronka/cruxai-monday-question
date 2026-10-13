# Helpdesk — conversation assignment interview

An Intercom-inspired frontend starter for a feature implementation interview. The inbox already has **Open** and **Closed** views with counts, a conversation list with **per-agent unread** indicators, message threads with per-conversation reply drafts, close/reopen, a customer details panel, and **live incoming messages**. An agent switcher lets you act as different agents viewing the same inbox. Data persists in browser SQLite. **Assignment is the candidate's task and is not implemented.**

Template: **Helpdesk** (shared with the snooze and reply-macros questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add assignment to **agents** and **teams** (define a few teams, e.g. Billing and Technical), plus **Mine**, **Unassigned**, and **team inbox** views with live counts.
2. Agents can **claim**, **transfer** (to an agent or team), and **release** conversations.
3. If two agents claim the same conversation **simultaneously**, only one succeeds and **both interfaces** reflect the outcome. Simulate the competing agent with a mock control you add.
4. Assignment changes update inbox membership and counts **live** without losing the agent's place: keep the open conversation and **reading position** when it leaves the current view.
5. Record assignment changes in a per-conversation **activity history** shown in the thread.

Add meaningful tests for claim races, view membership, and history.

## What the starter provides

- **Per-agent state** — `listConversations(status, agentId)` returns `unread` for that agent; `markRead(conversationId, agentId)`. Switch agents in the bottom-left select.
- **Versions** — each conversation has a `version` that increments on every change; use it for compare-and-set.
- **Live updates** — `subscribeToHelpdesk(listener)` emits `{ type: "message" | "conversation", conversationId }`.
- **Mock controls** — new conversation, customer replies, another agent (Marcus) replies, fail next reply, reset local data. `network.failNext(op)` / `network.loseNextResponse(op)` in `src/mock/network.ts` work for any operation you add with `simulate()`.
- **Browser SQLite** — `helpdeskDb()` in `src/api/helpdeskApi.ts`. Add tables or columns to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [Inbox UI](src/components/helpdesk/HelpdeskApp.tsx): views, list, thread, composer, customer panel, mock controls.
- [Mock API](src/api/helpdeskApi.ts), [fixtures](src/data/helpdeskData.ts), [types](src/types/helpdesk.ts).

## Mock API contract

- `listConversations(status, agentId)`, `countConversations()`, `getConversation(id, agentId)`, `getMessages(id)`, `getCustomer(id)`.
- `sendReply({ conversationId, agentId, body, clientId })` (idempotent by `clientId`), `setStatus(id, status, agentId)`, `markRead(id, agentId)`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
