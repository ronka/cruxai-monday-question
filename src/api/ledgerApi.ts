import { databases, initialFields, initialRecords, initialTaskRecords, taskFields } from "@/data/ledgerData";
import { clock } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type {
  CellValue,
  Field,
  FieldType,
  LedgerDatabase,
  LedgerEvent,
  LedgerRecord,
} from "@/types/ledger";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE fields (
  id TEXT PRIMARY KEY,
  database_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL
);
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  database_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export function ledgerDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "ledger",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      for (const field of [...initialFields, ...taskFields])
        db.run("INSERT INTO fields VALUES (?, ?, ?, ?, ?, ?)", [
          field.id,
          field.databaseId,
          field.name,
          field.type,
          JSON.stringify(field.options),
          field.position,
        ]);
      const now = clock.date().toISOString();
      for (const record of [...initialRecords, ...initialTaskRecords])
        db.run("INSERT INTO records VALUES (?, ?, ?, ?, ?)", [
          record.id,
          record.databaseId,
          JSON.stringify(record.values),
          now,
          now,
        ]);
    },
  });
}

const events = createEmitter<LedgerEvent>();
/** Live changes, including simulated collaborator edits. */
export const subscribeToLedger = events.subscribe;

type FieldRow = { id: string; database_id: string; name: string; type: FieldType; options: string; position: number };
type RecordRow = { id: string; database_id: string; data: string; created_at: string; updated_at: string };
const toField = (row: FieldRow): Field => ({
  id: row.id,
  databaseId: row.database_id,
  name: row.name,
  type: row.type,
  options: JSON.parse(row.options),
  position: row.position,
});
const toRecord = (row: RecordRow): LedgerRecord => ({
  id: row.id,
  databaseId: row.database_id,
  values: JSON.parse(row.data),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function findDatabase(id: string): LedgerDatabase {
  const database = databases.find((item) => item.id === id);
  if (!database) throw new Error("Database not found");
  return database;
}
function readRecord(db: LocalDatabase, id: string): LedgerRecord {
  const row = db.get<RecordRow>("SELECT * FROM records WHERE id = ?", [id]);
  if (!row) throw new Error("Record not found");
  return toRecord(row);
}
function readField(db: LocalDatabase, id: string): Field {
  const row = db.get<FieldRow>("SELECT * FROM fields WHERE id = ?", [id]);
  if (!row) throw new Error("Field not found");
  return toField(row);
}

export async function listDatabases(): Promise<LedgerDatabase[]> {
  return simulate("listDatabases", () => databases);
}

/** Database metadata and its fields in display order. */
export async function getDatabase(id: string): Promise<{ database: LedgerDatabase; fields: Field[] }> {
  const db = await ledgerDb();
  return simulate("getDatabase", () => ({
    database: findDatabase(id),
    fields: db
      .all<FieldRow>("SELECT * FROM fields WHERE database_id = ? ORDER BY position", [id])
      .map(toField),
  }));
}

export async function getRecords(databaseId: string): Promise<LedgerRecord[]> {
  const db = await ledgerDb();
  return simulate("getRecords", () => {
    findDatabase(databaseId);
    return db
      .all<RecordRow>("SELECT * FROM records WHERE database_id = ? ORDER BY created_at, rowid", [databaseId])
      .map(toRecord);
  });
}

export async function getRecord(id: string): Promise<LedgerRecord> {
  const db = await ledgerDb();
  return simulate("getRecord", () => readRecord(db, id));
}

function validate(field: Field, value: CellValue): CellValue {
  if (value === null || value === "") return null;
  switch (field.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
      return value;
    case "status":
      if (!field.options.includes(String(value))) throw new Error(`Unknown ${field.name}: ${value}`);
      return value;
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error(`${field.name} must be YYYY-MM-DD`);
      return value;
    default:
      return String(value);
  }
}

/** Updates one cell. Rejects values that do not match the field type. */
export async function updateRecordValue(recordId: string, fieldId: string, value: CellValue): Promise<LedgerRecord> {
  const db = await ledgerDb();
  return simulate("updateRecordValue", () => {
    const record = readRecord(db, recordId);
    const field = readField(db, fieldId);
    if (field.databaseId !== record.databaseId) throw new Error("Field belongs to another database");
    const values = { ...record.values, [fieldId]: validate(field, value) };
    const now = clock.date().toISOString();
    db.run("UPDATE records SET data = ?, updated_at = ? WHERE id = ?", [JSON.stringify(values), now, recordId]);
    events.emit({ type: "record", databaseId: record.databaseId, recordId });
    return readRecord(db, recordId);
  });
}

export async function createRecord(databaseId: string, values: Record<string, CellValue> = {}): Promise<LedgerRecord> {
  const db = await ledgerDb();
  return simulate("createRecord", () => {
    findDatabase(databaseId);
    const id = newId("r-");
    const now = clock.date().toISOString();
    db.run("INSERT INTO records VALUES (?, ?, ?, ?, ?)", [id, databaseId, JSON.stringify(values), now, now]);
    events.emit({ type: "record", databaseId, recordId: id });
    return readRecord(db, id);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await ledgerDb();
  return simulate("deleteRecord", () => {
    const record = readRecord(db, id);
    db.run("DELETE FROM records WHERE id = ?", [id]);
    events.emit({ type: "record", databaseId: record.databaseId, recordId: id });
  });
}

export async function addField(databaseId: string, input: { name: string; type: FieldType; options?: string[] }): Promise<Field> {
  const db = await ledgerDb();
  return simulate("addField", () => {
    findDatabase(databaseId);
    if (input.type === "title") throw new Error("A database has exactly one title field");
    const id = newId("f-");
    const { next } = db.get<{ next: number }>(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM fields WHERE database_id = ?",
      [databaseId],
    )!;
    db.run("INSERT INTO fields VALUES (?, ?, ?, ?, ?, ?)", [
      id,
      databaseId,
      input.name.trim() || "Untitled",
      input.type,
      JSON.stringify(input.options ?? []),
      next,
    ]);
    events.emit({ type: "schema", databaseId });
    return readField(db, id);
  });
}

export async function renameField(fieldId: string, name: string): Promise<Field> {
  const db = await ledgerDb();
  return simulate("renameField", () => {
    const field = readField(db, fieldId);
    db.run("UPDATE fields SET name = ? WHERE id = ?", [name.trim() || field.name, fieldId]);
    events.emit({ type: "schema", databaseId: field.databaseId });
    return readField(db, fieldId);
  });
}

/**
 * Deletes a field and removes its values from every record. The title field
 * cannot be deleted.
 */
export async function deleteField(fieldId: string): Promise<void> {
  const db = await ledgerDb();
  return simulate("deleteField", () => {
    const field = readField(db, fieldId);
    if (field.type === "title") throw new Error("The title field cannot be deleted");
    db.transaction(() => {
      db.run("DELETE FROM fields WHERE id = ?", [fieldId]);
      for (const row of db.all<RecordRow>("SELECT * FROM records WHERE database_id = ?", [field.databaseId])) {
        const values = JSON.parse(row.data);
        delete values[fieldId];
        db.run("UPDATE records SET data = ? WHERE id = ?", [JSON.stringify(values), row.id]);
      }
    });
    events.emit({ type: "schema", databaseId: field.databaseId });
  });
}

/** Mock control: a teammate edits a random record's status. */
export async function simulateCollaboratorEdit(databaseId: string): Promise<void> {
  const db = await ledgerDb();
  const status = db.get<FieldRow>("SELECT * FROM fields WHERE database_id = ? AND type = 'status'", [databaseId]);
  const rows = db.all<RecordRow>("SELECT * FROM records WHERE database_id = ?", [databaseId]);
  if (!status || rows.length === 0) throw new Error("Nothing to edit");
  const row = rows[Math.floor(Math.random() * rows.length)];
  const options = JSON.parse(status.options) as string[];
  const values = { ...JSON.parse(row.data), [status.id]: options[Math.floor(Math.random() * options.length)] };
  db.run("UPDATE records SET data = ?, updated_at = ? WHERE id = ?", [JSON.stringify(values), clock.date().toISOString(), row.id]);
  events.emit({ type: "record", databaseId, recordId: row.id });
}

/** Mock control: a teammate edits a random task's estimate. */
export async function simulateEstimateChange(): Promise<void> {
  const db = await ledgerDb();
  const rows = db.all<RecordRow>("SELECT * FROM records WHERE database_id = 'tasks'");
  if (rows.length === 0) throw new Error("No tasks left");
  const row = rows[Math.floor(Math.random() * rows.length)];
  const values = { ...JSON.parse(row.data), "t-estimate": 1 + Math.floor(Math.random() * 16) };
  db.run("UPDATE records SET data = ?, updated_at = ? WHERE id = ?", [JSON.stringify(values), clock.date().toISOString(), row.id]);
  events.emit({ type: "record", databaseId: "tasks", recordId: row.id });
}

/** Mock control: a teammate deletes a task by ID (e.g. "t-3"). */
export async function simulateTaskDeletion(id: string): Promise<void> {
  const db = await ledgerDb();
  const record = readRecord(db, id);
  if (record.databaseId !== "tasks") throw new Error("Not a task");
  db.run("DELETE FROM records WHERE id = ?", [id]);
  events.emit({ type: "record", databaseId: "tasks", recordId: id });
}

export function failNextSave(): void {
  network.failNext("updateRecordValue");
}

export async function resetLedgerData(): Promise<void> {
  await (await ledgerDb()).reset();
}
