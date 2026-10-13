# Relay — threaded conversations interview

A Slack-inspired frontend starter for a feature implementation interview. The app already has channels, searchable message history, message sending, per-channel drafts, channel URLs, and simulated live messages. **Threaded conversations are the candidate's task and are not implemented.**

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. No environment variables, database, account, or backend required. Uses the existing Next.js 15, React 18, TypeScript, and TanStack Query dependencies.

## Task

Add threaded conversations to the workspace:

1. Open any channel message in a side panel showing the original message and its replies. Close the panel without losing the channel position.
2. Send replies optimistically. Show pending and failed states; retry a failed reply without losing text or creating duplicates.
3. Display a reply count and unique participant avatars on the parent message in the channel timeline. Replies must not become top-level channel messages.
4. Receive new replies live and keep the thread and parent summary consistent. Clean up subscriptions and avoid stale results when switching threads quickly.
5. Preserve unfinished drafts independently for each thread when switching, closing, and reopening threads. Persistence across a full page refresh is optional.
6. Support a shareable URL that loads the correct channel and parent message after a fresh page load. Handle missing messages and back/forward navigation.
7. Include loading, empty, failure, and keyboard-accessible states. Keep the existing channel search and message sending working.

Choose and document the URL format and state design. Add meaningful tests for the interactions and races your implementation handles. No backend implementation is required.

## Code map

- [Workspace UI](src/components/chat/ChatWorkspace.tsx): channel routing, query subscriptions, composer, mock controls.
- [Message list](src/components/chat/MessageList.tsx): flat channel messages.
- [Mock API](src/api/chatApi.ts): async in-memory reads/writes with 350 ms latency.
- [Fixtures](src/data/chatData.ts): channels, members, starting messages.
- [Types](src/types/chat.ts): message and send contracts.

`app/` is the Next.js route directory. This branch replaces the Monday exercise; the original is preserved on `main`.

## Mock API contract

- `getMessages(channelId)` returns top-level messages only.
- `getMessage(id)` returns one message or rejects if missing.
- `getReplies(parentId)` returns replies to a message.
- `sendMessage({ channelId, body, clientId, parentId? })` sends either a channel message or a reply. Use a stable client ID to make successful retries idempotent. The server trims whitespace and rejects empty or oversized messages.
- `subscribeToMessages(listener)` delivers new messages and replies, and returns an unsubscribe function. A successful send also emits an event before its promise resolves.
- `simulateIncomingMessage(channelId, parentId?)` creates a message from another member. Pass a parent ID to exercise incoming thread replies as you build the feature.
- `failNextMessageSend()` makes the next new send reject once.

The collapsible controls beneath the composer can inject messages, enable a 15-second incoming-message interval, or fail the next send. Automatic simulation is off by default. Thread API functions are supplied as infrastructure, but no thread UI, summaries, optimistic reply state, thread drafts, or thread routing is supplied.

Data is local to this browser tab and resets on reload. Cross-tab synchronization and production persistence are out of scope.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
