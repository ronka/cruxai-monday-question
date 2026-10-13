# Tracker — triage inbox and duplicate handling interview

A Linear-inspired frontend starter for a feature implementation interview. The app already has projects, a list view and drag-and-drop board, an issue detail panel with activity history, archive/delete, and cross-project search. Six incoming customer reports sit in the **triage** state (outside the project boards), and a mock control adds more. Data persists in browser SQLite. **The triage workflow is the candidate's task and is not implemented.**

Template: **Tracker** (shared with the issue-dependencies and cycle-planning questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Build a **triage inbox** listing issues in the `triage` state, with a detail view for the selected report.
2. **Accept**: requires choosing a priority first; moves the issue onto its project board (e.g. Todo or Backlog).
3. **Decline**: requires a reason; the reason is visible in the issue's history.
4. **Mark as duplicate**: search existing issues across projects and link to a **canonical** issue. Prevent self-links and duplicate chains that would form a cycle; decide how chains (A dup of B, B dup of C) resolve.
5. After any action, keep keyboard focus on the **next available** issue. Provide keyboard shortcuts for the actions.
6. New reports arriving, or a failed mutation, must not unexpectedly change the selected issue or lose the reviewer's in-progress draft (reason, priority, duplicate search).

Add meaningful tests for duplicate-cycle prevention and selection behavior after actions.

## What the starter provides

- **Triage issues** — `status: "triage"`, priority 0, unassigned; the description starts with `Reported by <email>`. One report (`WEB-…` “Screen flickers…”) is a likely duplicate of `WEB-3`.
- **Incoming reports** — **Mock controls → New customer report arrives in triage** inserts one and emits a live event.
- **Search** — `searchIssues(query, { includeArchived? })` across projects.
- **Failures** — fail the next issue update; slow the network to 2 s to exercise in-flight states.
- **Browser SQLite** — `trackerDb()` in `src/api/trackerApi.ts`. Add tables or columns to `SCHEMA` and bump `version` (this discards saved data).

## Code map

- [App shell](src/components/tracker/TrackerApp.tsx): routing, queries, optimistic updates, mock controls, sidebar triage count.
- [List and board](src/components/tracker/IssueViews.tsx), [detail panel](src/components/tracker/IssueDetail.tsx), [icons](src/components/tracker/bits.tsx).
- [Mock API](src/api/trackerApi.ts), [fixtures](src/data/trackerData.ts), [types](src/types/tracker.ts).

## Mock API contract

- `getTriageIssues()` — triage issues across projects, oldest first.
- `getProjectIssues(projectId)` excludes triage and archived issues.
- `getIssue(idOrIdentifier)`, `searchIssues(query)`, `getIssueHistory(issueId)`.
- `updateIssue(id, patch)` writes one history entry per changed field; `archiveIssue`, `deleteIssue`.
- `subscribeToTracker(listener)` emits `{ type: "issue" | "deleted", issueId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
