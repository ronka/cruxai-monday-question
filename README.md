# Pull Review — review progress across new commits interview

A GitHub-inspired frontend starter for a feature implementation interview. The app shows pull request #482 with a changed-files list, unified diffs with expandable context, and inline comments. Every changed file has a **stable `fileId`** (kept across renames) and a per-file **`contentRevision`**. A mock control pushes new commits: the first one **edits** `server.ts`, **renames** `config.ts` → `settings.ts` (same content), **adds** a test file, **deletes** `routes/issues.ts`, and **reverts** `README.md` so it leaves the diff; the second edits `rateLimiter.ts`. A header switcher selects the reviewer. Data persists in browser SQLite. **Viewed-file progress is the candidate's task and is not implemented.**

Template: **Pull Review** (shared with the batched-reviews and suggested-changes questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add a **Viewed** toggle to each file header (viewed files collapse) and a **progress indicator** (e.g. “3 / 5 files viewed”).
2. Add a **Hide viewed files** filter.
3. Persist progress **per reviewer and per file revision**; switching **Reviewing as** shows that reviewer's progress. Restore progress after refresh.
4. When a new commit arrives, **retain** progress for files whose content did not change (including the pure **rename**) and **invalidate** it for changed files. Files that leave the diff no longer count; added files start unviewed.
5. If the **selected/focused file** disappears or becomes hidden (filter, revert, deletion), move focus predictably and keep totals consistent.

Add meaningful tests for retention/invalidation across pushes and for focus/total behavior.

## What the starter provides

- **Stable identity** — `ChangedFile.fileId`, `status` (`added | modified | removed | renamed`), `previousPath`, and `contentRevision` from `getChangedFiles(sha?)`.
- **Pushes** — **Mock controls → Author pushes a new commit** (twice); `getPullRequest().headSha` and `subscribeToReview` (`{ type: "push" }`).
- **Diff renderer** — `FileDiff` with `headerActions`, `collapsed`, and `onToggleCollapsed` props.
- **Reviewer** — `reviewer` state in `ReviewApp` (header select).
- **Browser SQLite** — `reviewDb()` in `src/api/reviewApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data).

## Code map

- [App shell](src/components/review/ReviewApp.tsx), [diff renderer](src/components/review/FileDiff.tsx), [diff engine](src/lib/diff.ts).
- [Mock API](src/api/reviewApi.ts), [fixtures](src/data/reviewData.ts) (`commit2`, `commit3` describe exactly what changes), [types](src/types/review.ts).

## Mock API contract

- `getPullRequest()`, `getChangedFiles(sha?)`, `listComments()`, `publishComment(input)`, `contentHash(content)`.
- `subscribeToReview(listener)` emits `{ type: "push", headSha }` or `{ type: "comment", commentId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
