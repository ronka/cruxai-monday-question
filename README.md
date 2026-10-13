# Pull Review — apply suggested changes in a batch interview

A GitHub-inspired frontend starter for a feature implementation interview. The app shows pull request #482 with a changed-files list, unified diffs with expandable context, and inline comments. Seven published comments contain **structured suggestions** (replacement text for a line range), including two that **overlap** and one written against **stale** content. The starter supplies a **file-content store** and a **mock commit adapter** (idempotency keys, head checks, failure and lost-response controls). No real Git is involved. Data persists in browser SQLite. **Previewing, selecting, and applying suggestions is the candidate's task and is not implemented.**

Template: **Pull Review** (shared with the batched-reviews and review-progress questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Let a reviewer **preview** suggestions and **select several**, then apply them in **one simulated commit** (`createCommit`).
2. Detect and explain **overlapping ranges** and suggestions based on **stale content** (the file's current lines no longer match `originalLines`) — including after **Author pushes a new commit**.
3. Multiple edits to one file must be computed from the **original coordinates**: applying an earlier replacement must not shift later replacements onto the wrong lines.
4. Either apply the **entire validated batch** or leave every file unchanged.
5. Show a **result summary** (applied, skipped, and why). Make **retries safe**: after **Lose next commit response**, retrying must not create a second commit.

Add meaningful tests for range validation, multi-edit application, and retry safety.

## What the starter provides

- **Suggestions** — `ReviewComment.suggestion` = `{ startLine, endLine, replacement, originalLines }` (head lines, inclusive). `CommentCard` renders them.
- **File store** — `getFileContent(fileId, sha?)` returns head (or any commit's) content.
- **Commit adapter** — `createCommit({ parentSha, message, changes: [{ fileId, content }], idempotencyKey })`: atomic, rejects if the head moved, returns the original SHA when an idempotency key repeats. Emits a `push` event.
- **Mock controls** — author pushes a new commit, teammate comments, fail next commit, lose next commit response, fail next comment publish, reset local data.
- **Browser SQLite** — `reviewDb()` in `src/api/reviewApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data).

## Code map

- [App shell and comment card](src/components/review/ReviewApp.tsx), [diff renderer](src/components/review/FileDiff.tsx), [diff engine](src/lib/diff.ts).
- [Mock API](src/api/reviewApi.ts), [fixtures](src/data/reviewData.ts) (`seedSuggestions`), [types](src/types/review.ts).

## Mock API contract

- `getPullRequest()`, `getChangedFiles(sha?)`, `listComments()`, `publishComment(input)`.
- `getFileContent(fileId, sha?)`, `createCommit(input)`.
- `subscribeToReview(listener)` emits `{ type: "push", headSha }` or `{ type: "comment", commentId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
