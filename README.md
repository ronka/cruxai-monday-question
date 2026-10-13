# Ledger — related records and rollups interview

A Notion-inspired frontend starter for a feature implementation interview. The workspace has two databases, **Projects** and **Tasks**, each shown as an editable table (TanStack Table) with typed cells, sorting, a status filter, a record side peek, and field management. Tasks have numeric hour estimates and a completion status. Data persists in browser SQLite. **Relations and rollups are the candidate's task; no relation editor or rollup calculation exists.**

Template: **Ledger** (shared with the saved-views and record-templates questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002 (Projects) or http://localhost:3002/?db=tasks (Tasks).

## Task

1. Add a **relation** column that links each project to tasks, edited through a searchable multi-select. A task's side of the relation should be visible from the Tasks database.
2. Add configurable **rollup** columns on Projects: total estimated hours and completed-task count (choose how the rollup is configured).
3. Updating a linked task (estimate, status, deletion) refreshes the affected project values — including changes made by simulated teammates.
4. Handle unlinking, deleted tasks, empty relations (show an empty state, not `0` vs. blank confusion — decide and document), and missing estimates.
5. A failed save must not leave the two tables inconsistent.
6. Rollups are derived: they cannot be edited directly.

Add meaningful tests for rollup computation and consistency after failures.

## What the starter provides

- **Datasets** — `projects` (14 records) and `tasks` (20 records, one without an estimate) in `src/data/ledgerData.ts`.
- **Browser SQLite** — `ledgerDb()` in `src/api/ledgerApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back every statement if the callback throws.
- **Field types** — `FieldType` in `src/types/ledger.ts`; `Cells.tsx` renders and edits each type. Add new types there.
- **Mock controls** — teammate changes a task estimate, teammate deletes a task by ID, fail the next cell save, reset local data.

## Code map

- [App shell](src/components/ledger/LedgerApp.tsx): routing (`?db=&record=`), queries, mock controls.
- [Table](src/components/ledger/DatabaseTable.tsx): TanStack Table rendering, sorting, resizing.
- [Cells](src/components/ledger/Cells.tsx), [record peek](src/components/ledger/RecordPeek.tsx).
- [Mock API](src/api/ledgerApi.ts) and [fixtures](src/data/ledgerData.ts).

## Mock API contract

- `getDatabase(id)` → `{ database, fields }`; `getRecords(databaseId)`; `getRecord(id)`.
- `updateRecordValue(recordId, fieldId, value)` validates against the field type.
- `createRecord`, `deleteRecord`, `addField`, `renameField`, `deleteField`.
- `subscribeToLedger(listener)` emits `{ type: "record" | "schema", databaseId, recordId? }` on any change, including teammate edits.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
