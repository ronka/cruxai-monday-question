# Tracker — cycle planning and rollover interview

A Linear-inspired frontend starter for a feature implementation interview. The app already has projects, a list view and drag-and-drop board, an issue detail panel with estimates and activity history, and archive/delete. Two cycle records exist (**Cycle 12**, current, and **Cycle 13**, next) and some issues are already planned into them. A mock clock controls "now". Data persists in browser SQLite. **The cycle-planning screen and closing a cycle are the candidate's task and are not implemented.**

Template: **Tracker** (shared with the issue-dependencies and triage questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add a **planning screen** for assigning issues (from any project) to the current or next cycle, and removing them.
2. Show totals per cycle: **planned** estimate and **completed** estimate. Decide and document how unestimated issues count.
3. **Close a cycle**: move unfinished, eligible issues to the next cycle. Completed and canceled issues are not rolled over; decide whether archived issues are.
4. Preserve the closed cycle's **historical summary** (what was planned, completed, and rolled over at close time). Later edits to those issues must not rewrite it.
5. Repeating the close action, double-clicking, or reloading during it must not move issues twice or rewrite the summary.
6. Use the mock clock to decide which cycle is current.

Add meaningful tests for rollover eligibility, totals, and idempotent closing.

## What the starter provides

- **Cycles** — `cycles` table (`c-12`: Oct 5–19, `c-13`: Oct 19–Nov 2) with a nullable `closed_at`. Issues have a nullable `cycleId`; `updateIssue(id, { cycleId })` changes it and records history.
- **Estimates** — story points (1, 2, 3, 5, 8) or null; one seeded issue is unestimated.
- **Issue history** — `getIssueHistory(issueId)` returns one entry per field change, with the acting user and mock time.
- **Mock clock** — `src/mock/clock.ts`. Use the clock buttons, or **Jump to Oct 19**, in **Mock controls**. Use `clock.now()` rather than `Date.now()`.
- **Browser SQLite** — `trackerDb()` in `src/api/trackerApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.
- **Mock controls** — teammate advances an issue's status; fail the next issue update; reset local data.

## Code map

- [App shell](src/components/tracker/TrackerApp.tsx): routing, queries, optimistic updates, mock controls.
- [List and board](src/components/tracker/IssueViews.tsx), [detail panel](src/components/tracker/IssueDetail.tsx).
- [Mock API](src/api/trackerApi.ts), [fixtures](src/data/trackerData.ts), [types](src/types/tracker.ts).

## Mock API contract

- `listCycles()`, `getCycleIssues(cycleId)`, `getUnplannedIssues()`.
- `getProjectIssues(projectId)`, `getIssue(idOrIdentifier)`, `searchIssues(query)`.
- `updateIssue(id, patch)` — patch may include `cycleId`, `status`, `estimate`, …; writes history per changed field.
- `getIssueHistory(issueId)`; `subscribeToTracker(listener)` emits `{ type: "issue" | "deleted", issueId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
