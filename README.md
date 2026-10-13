# Ledger — saved database views interview

A Notion-inspired frontend starter for a feature implementation interview. The app already has a Projects database shown as a table with editable title, text, status, person, date, and number fields; single-column sorting; a single status filter; column resizing; a record side peek; and field deletion. Data persists in browser SQLite. **Saved views are the candidate's task and are not implemented.**

Template: **Ledger** (shared with the relations/rollups and record-templates questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002. No environment variables, server, account, or backend required.

## Task

Add named, saved views to the database:

1. Each view remembers its **filters, sort order, visible columns, and column widths**.
2. Filters support AND/OR groups (for example `Status is In progress AND (Owner is Ava OR Due before Nov 1)`).
3. Users can create, rename, duplicate, delete, and switch between views.
4. Changing a view's configuration marks it as having unsaved changes. Provide an explicit **Save** or **Discard** flow; switching away with unsaved changes must not silently lose or save them.
5. Views survive a page refresh.
6. Deleting a field that a saved view uses (filter, sort, or column) leaves that view usable and makes the impact visible.

Choose and document the view data model. Add meaningful tests for filter evaluation, unsaved-change handling, and field deletion.

## What the starter provides

- **Browser SQLite** — `src/mock/sqlite.ts`. `ledgerDb()` in `src/api/ledgerApi.ts` opens the `ledger` database. Add your own tables to `SCHEMA` and bump `version` (this discards saved data). Use `db.transaction()` for multi-statement changes.
- **Table component** — `DatabaseTable` (TanStack Table) handles typed cells, inline editing, sorting, and column resizing. Its sizing state is currently local and lost on refresh.
- **Field deletion** — hover a column header and click the trash icon. `deleteField` removes the field and its values.
- **Mock controls** — a teammate edits a record's status; fail the next cell save; reset local data.

## Code map

- [App shell](src/components/ledger/LedgerApp.tsx): routing (`?db=&record=`), queries, filter and sort state, mock controls.
- [Table](src/components/ledger/DatabaseTable.tsx): TanStack Table rendering, sorting, resizing.
- [Cells](src/components/ledger/Cells.tsx): display and inline editors per field type.
- [Record peek](src/components/ledger/RecordPeek.tsx): property form for one record.
- [Mock API](src/api/ledgerApi.ts) and [fixtures](src/data/ledgerData.ts).

## Mock API contract

- `getDatabase(id)` → `{ database, fields }` with fields in display order.
- `getRecords(databaseId)`, `getRecord(id)`, `createRecord`, `deleteRecord`.
- `updateRecordValue(recordId, fieldId, value)` validates the value against the field type.
- `addField`, `renameField`, `deleteField(fieldId)` (the title field cannot be deleted).
- `subscribeToLedger(listener)` emits `{ type: "record" | "schema", databaseId }` on any change.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
