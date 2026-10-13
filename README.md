# Ledger — reusable record templates interview

A Notion-inspired frontend starter for a feature implementation interview. The app already has a Projects database shown as an editable table and a record side peek with an editable title, typed properties, and a basic checklist editor. Data persists in browser SQLite. **Record templates are the candidate's task and are not implemented.** No rich-text editor is required.

Template: **Ledger** (shared with the saved-views and relations/rollups questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002 and click **Open** on a row (or `?record=p-1`) to see the record form and checklist.

## Task

1. Save an existing record as a **template** (title, property values, and checklist). Preview a template before using it.
2. Create new records from a template. Support editing, duplicating, and deleting templates, and choosing a **default** template used by **New**.
3. Instantiated records and their checklist items receive **new, independent IDs**. Editing a template later never changes records already created from it — and editing such a record never changes the template.
4. When the database schema changes — a property is deleted or its type changes — flag template defaults that are now incompatible (for example a text value in a number field, or a status option that no longer exists) and let users repair the template.
5. Templates survive a page refresh.

Add meaningful tests for instantiation independence and schema-compatibility checks.

## What the starter provides

- **Record form** — `RecordPeek` edits title and properties; `ChecklistEditor` edits checklist items (`{ id, text, done }`).
- **Schema changes** — **Mock controls → Schema changes** simulate an admin changing *Budget* to text, *Team* to status, or deleting *Due*. `changeFieldType` converts or clears existing values; `deleteField` removes values.
- **Browser SQLite** — `ledgerDb()` in `src/api/ledgerApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.
- **IDs** — `newId(prefix)` in `src/mock/events.ts`.

## Code map

- [App shell](src/components/ledger/LedgerApp.tsx): routing (`?db=&record=`), queries, **New** button, mock controls.
- [Record peek](src/components/ledger/RecordPeek.tsx) and [checklist editor](src/components/ledger/ChecklistEditor.tsx).
- [Table](src/components/ledger/DatabaseTable.tsx), [cells](src/components/ledger/Cells.tsx).
- [Mock API](src/api/ledgerApi.ts) and [fixtures](src/data/ledgerData.ts).

## Mock API contract

- `getDatabase(id)` → `{ database, fields }`; `getRecords`, `getRecord`.
- `createRecord(databaseId, values?)` creates a record with an empty checklist.
- `updateRecordValue(recordId, fieldId, value)` validates against the field type.
- `updateChecklist(recordId, items)` replaces the checklist; item IDs must be unique within the record.
- `addField`, `renameField`, `deleteField`, `changeFieldType(fieldId, type, options?)`.
- `subscribeToLedger(listener)` emits `{ type: "record" | "schema", databaseId }` on any change.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
