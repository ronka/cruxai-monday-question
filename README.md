# Pull Review — batched pull-request reviews interview

A GitHub-inspired frontend starter for a feature implementation interview. The app shows pull request #482 with a changed-files list, unified diffs with expandable context lines, and published inline comments. Reviewers can already publish a **single** comment on a line. The mock API serves **versioned diff fixtures**: a mock control makes the author push a second commit, after which comments on changed lines become *outdated*. Data persists in browser SQLite. **Batched reviews are the candidate's task and are not implemented.**

Template: **Pull Review** (shared with the review-progress and suggested-changes questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Let reviewers **start a review** and draft several inline comments (pending) instead of publishing each one.
2. Drafts **survive navigation and refresh**, are **private** before submission (not visible as published comments), and can be **edited or deleted**.
3. Submit the review as **Comment**, **Approve**, or **Request changes**, with an optional summary. Show the review state on the page.
4. If a **new commit** arrives (**Author pushes a new commit**) while drafting, preserve all drafts and distinguish drafts that can still attach to the latest commit from those whose lines changed (**outdated**). Decide and document what submitting outdated drafts does.
5. **Retrying** a failed or lost submission must **not duplicate** the review or its comments.

Add meaningful tests for draft persistence, outdated detection, and idempotent submission.

## What the starter provides

- **Diff renderer** — `FileDiff` renders unified diffs with expandable context, a hover “+” button per line (`onStartComment`), and slots for comments (`renderComment`) and a composer.
- **Diff engine** — `src/lib/diff.ts` (`diffLines`, `segmentRows`, `countChanges`).
- **Versioned fixtures** — `getPullRequest()` (commits, `headSha`), `getChangedFiles(sha?)`. Files have stable `fileId`s and a `contentRevision`.
- **Comments** — `listComments()` (with computed `outdated`), `publishComment({ fileId, line, side, body })`.
- **Mock controls** — author pushes a new commit, teammate publishes a comment, fail next comment publish, reset local data. `network.loseNextResponse(op)` in `src/mock/network.ts` simulates a lost response for any operation you add.
- **Browser SQLite** — `reviewDb()` in `src/api/reviewApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.

## Code map

- [App shell](src/components/review/ReviewApp.tsx): PR header, tabs, file list, single-comment composer, mock controls.
- [Diff renderer](src/components/review/FileDiff.tsx), [diff engine](src/lib/diff.ts).
- [Mock API](src/api/reviewApi.ts), [fixtures](src/data/reviewData.ts), [types](src/types/review.ts).

## Mock API contract

- `getPullRequest()`, `getChangedFiles(sha?)`, `listComments()`, `publishComment(input)`.
- `subscribeToReview(listener)` emits `{ type: "push", headSha }` or `{ type: "comment", commentId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
