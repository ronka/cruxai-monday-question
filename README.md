# Helpdesk — reply macros with actions interview

An Intercom-inspired frontend starter for a feature implementation interview. The inbox already has Open/Closed views, per-agent unread indicators, threads, close/reopen, an agent switcher, and live simulated messages. It supplies **customer attribute fields** (some missing), **persisted reply drafts** per agent and conversation, **tags**, **priorities**, and **team** records, plus per-operation **failure controls**. React Hook Form is installed. Data persists in browser SQLite. **Macros are the candidate's task; no macro editor exists.**

Template: **Helpdesk** (shared with the assignment and snooze questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Build a **macro editor** (React Hook Form): name, reply text with **customer placeholders** (e.g. `{{first_name}}`, `{{order_id}}`), and optional actions — **add tags**, **set priority**, **close** — and optionally share a macro with a **team**. Macros persist.
2. Applying a macro shows a **preview**: the resolved message and the list of actions that will run.
3. **Missing placeholder values** (see *Aarav Shah*, *Grace Okoye*) must be resolved (fallback or manual input) before sending.
4. An **existing draft** must not be silently overwritten — offer insert/replace/cancel.
5. Execute **send first**, then the selected actions in order. If an action fails after the send succeeded, **retry the remaining actions without resending** the message, and show exactly what succeeded and what failed.

Add meaningful tests for placeholder resolution, the execution plan, and partial-failure retry.

## What the starter provides

- **Customer fields** — `Customer.attributes` (`first_name`, `account_manager`, `renewal_date`, `order_id`; `null` = missing), shown in the right panel.
- **Drafts** — `getDraft(conversationId, agentId)`, `saveDraft(conversationId, agentId, body)`; the composer saves automatically.
- **Actions** — `addTag`, `removeTag`, `setPriority`, `setStatus`; `listTags()`, `listTeams()`.
- **Sending** — `sendReply({ conversationId, agentId, body, clientId })` is idempotent by `clientId`.
- **Mock controls** — fail next reply / add tag / priority change / close; **lose next reply response** (the reply is stored but the caller sees a timeout).
- **Browser SQLite** — `helpdeskDb()` in `src/api/helpdeskApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [Inbox UI](src/components/helpdesk/HelpdeskApp.tsx): header with priority and tags, composer with saved drafts, customer attributes, mock controls.
- [Mock API](src/api/helpdeskApi.ts), [fixtures](src/data/helpdeskData.ts), [types](src/types/helpdesk.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
