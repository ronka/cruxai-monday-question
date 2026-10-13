import { seedArtboards } from "@/data/canvasData";
import { clock } from "@/mock/clock";
import { createEmitter } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Artboard, DesignDocument } from "@/types/canvas";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  revision INTEGER NOT NULL,
  artboards TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const DOCUMENT_ID = "lumina-app";

export function canvasDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "canvas",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      db.run("INSERT INTO documents VALUES (?, ?, 1, ?, ?)", [DOCUMENT_ID, "Lumina — App redesign", JSON.stringify(seedArtboards), clock.date().toISOString()]);
    },
  });
}

const events = createEmitter<{ type: "document"; documentId: string; revision: number }>();
export const subscribeToDocument = events.subscribe;

type Row = { id: string; name: string; revision: number; artboards: string; updated_at: string };
export function readDocument(db: LocalDatabase, id: string): DesignDocument {
  const row = db.get<Row>("SELECT * FROM documents WHERE id = ?", [id]);
  if (!row) throw new Error("File not found");
  return { id: row.id, name: row.name, revision: row.revision, artboards: JSON.parse(row.artboards), updatedAt: row.updated_at };
}

export async function getDocument(id: string = DOCUMENT_ID): Promise<DesignDocument> {
  const db = await canvasDb();
  return simulate("getDocument", () => readDocument(db, id));
}

/**
 * Mock control: a teammate edits the file (changes an artboard's background
 * and name), producing a new revision. Use it while an export is running.
 */
export async function simulateTeammateEdit(artboardId = "ab-home"): Promise<DesignDocument> {
  const db = await canvasDb();
  const current = readDocument(db, DOCUMENT_ID);
  const palette = ["#fef3c7", "#e0f2fe", "#fce7f3", "#dcfce7", "#f3f4f6"];
  const artboards: Artboard[] = current.artboards.map((a) =>
    a.id === artboardId ? { ...a, background: palette[(current.revision + 1) % palette.length], name: a.name.replace(/ \(edited\)$/, "") + " (edited)" } : a,
  );
  const revision = current.revision + 1;
  db.run("UPDATE documents SET revision = ?, artboards = ?, updated_at = ? WHERE id = ?", [revision, JSON.stringify(artboards), clock.date().toISOString(), DOCUMENT_ID]);
  events.emit({ type: "document", documentId: DOCUMENT_ID, revision });
  return readDocument(db, DOCUMENT_ID);
}

export function failNextDocumentLoad(): void {
  network.failNext("getDocument");
}

export async function resetCanvasData(): Promise<void> {
  await (await canvasDb()).reset();
}
