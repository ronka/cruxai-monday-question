# Tracker — issue dependencies interview

A Linear-inspired frontend starter for a feature implementation interview. The app already has projects, a list view and a drag-and-drop board grouped by status, an issue detail panel (status, priority, assignee, estimate, activity history), archive/restore, delete, and cross-project search in the API. Data persists in browser SQLite. **Issue dependencies are the candidate's task and are not implemented.**

Template: **Tracker** (shared with the cycle-planning and triage questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. URLs look like `?project=web&view=board&issue=WEB-1`.

## Task

1. Let users mark an issue as **blocked by** another issue (and see what it blocks). Show dependencies in the issue detail panel.
2. Show a **blocked indicator** on board cards and list rows while any blocker is unfinished.
3. Prevent circular dependencies, including indirect cycles (A → B → C → A), and self-dependencies.
4. Moving a blocked issue to **Done** (by drag or by the status picker) requires confirmation. Completing or canceling its blockers updates the indicators everywhere — including when a simulated teammate does it.
5. Dependency selection searches across **all projects** (`searchIssues`).
6. Handle archived and deleted issues gracefully: decide whether they still block, and render them clearly instead of crashing.

Add meaningful tests for cycle detection and blocked-state derivation.

## What the starter provides

- **Browser SQLite** — `trackerDb()` in `src/api/trackerApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.
- **Board** — `IssueBoard` supports HTML drag and drop between status columns; moves go through `update()` in `TrackerApp` with optimistic updates and rollback.
- **Archived/deleted fixtures** — `WEB-9` and `MOB-6` are archived. Use the detail panel to archive or delete more.
- **Mock controls** — a teammate advances an issue's status (emits a live event); fail the next issue update; reset local data.

## Code map

- [App shell](src/components/tracker/TrackerApp.tsx): routing, queries, optimistic updates, mock controls.
- [List and board](src/components/tracker/IssueViews.tsx), [detail panel](src/components/tracker/IssueDetail.tsx), [icons](src/components/tracker/bits.tsx).
- [Mock API](src/api/trackerApi.ts), [fixtures](src/data/trackerData.ts), [types](src/types/tracker.ts).

## Mock API contract

- `listProjects()`, `getProjectIssues(projectId)` (excludes archived).
- `getIssue(idOrIdentifier)` returns archived issues; rejects `Issue not found` for deleted ones.
- `searchIssues(query, { includeArchived? })` searches titles and identifiers across projects.
- `updateIssue(id, patch)` writes one history entry per changed field; `createIssue`, `archiveIssue(id, archived)`, `deleteIssue(id)`.
- `getIssueHistory(issueId)`; `subscribeToTracker(listener)` emits `{ type: "issue" | "deleted", issueId }`.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
