import { CURRENT_USER, seedArtboards } from "@/data/canvasData";
import { clock, DAY, HOUR } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Artboard, DesignDocument, DocumentVersion, DocumentVersionSnapshot } from "@/types/canvas";

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
CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  label TEXT,
  revision INTEGER NOT NULL,
  author_id TEXT NOT NULL,
  artboards TEXT NOT NULL,
  created_at TEXT NOT NULL
);
-- Versions are immutable: there is no UPDATE path in the API.
`;

export const DOCUMENT_ID = "lumina-app";

export function canvasDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "canvas",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const now = clock.now();
      const history: [label: string | null, author: string, ageHours: number, artboards: Artboard[]][] = [
        ["Initial wireframes", "ines", 9 * 24, seedArtboards.slice(0, 2).map((a) => ({ ...a, name: a.name.replace("Mobile", "wireframe") }))],
        [null, "ines", 6 * 24, seedArtboards.slice(0, 3)],
        ["Dashboard handoff", "ravi", 3 * 24, seedArtboards.slice(0, 4).map((a) => (a.id === "ab-settings" ? { ...a, x: 910 } : a))],
        [null, "kai", 20, seedArtboards],
      ];
      history.forEach(([label, author, age, artboards], index) =>
        db.run("INSERT INTO versions VALUES (?, ?, ?, ?, ?, ?, ?)", [
          `v-${index + 1}`,
          DOCUMENT_ID,
          label,
          index + 1,
          author,
          JSON.stringify(artboards),
          new Date(now - age * HOUR).toISOString(),
        ]),
      );
      db.run("INSERT INTO documents VALUES (?, ?, ?, ?, ?)", [DOCUMENT_ID, "Lumina — App redesign", history.length, JSON.stringify(seedArtboards), new Date(now - 20 * HOUR).toISOString()]);
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

/** Rejected when the document's revision moved past `expectedRevision`. */
export class RevisionConflictError extends Error {
  constructor(readonly current: DesignDocument) {
    super(`Someone saved revision ${current.revision} while you were editing.`);
    this.name = "RevisionConflictError";
  }
}

function write(db: LocalDatabase, id: string, artboards: Artboard[], authorId: string, label: string | null, expectedRevision?: number): DesignDocument {
  const current = readDocument(db, id);
  if (expectedRevision !== undefined && expectedRevision !== current.revision) throw new RevisionConflictError(current);
  const revision = current.revision + 1;
  const now = clock.date().toISOString();
  db.transaction(() => {
    db.run("UPDATE documents SET revision = ?, artboards = ?, updated_at = ? WHERE id = ?", [revision, JSON.stringify(artboards), now, id]);
    db.run("INSERT INTO versions VALUES (?, ?, ?, ?, ?, ?, ?)", [newId("v-"), id, label, revision, authorId, JSON.stringify(artboards), now]);
  });
  events.emit({ type: "document", documentId: id, revision });
  return readDocument(db, id);
}

/**
 * Saves the full artboard list as a new revision (and an autosave version).
 * Pass the revision you edited; a newer one rejects with RevisionConflictError.
 */
export async function saveDocument(id: string, artboards: Artboard[], expectedRevision: number, label: string | null = null): Promise<DesignDocument> {
  const db = await canvasDb();
  return simulate("saveDocument", () => write(db, id, artboards, CURRENT_USER.id, label, expectedRevision));
}

type VersionRow = { id: string; document_id: string; label: string | null; revision: number; author_id: string; artboards: string; created_at: string };
const toVersion = (row: VersionRow): DocumentVersion => ({
  id: row.id,
  documentId: row.document_id,
  label: row.label,
  revision: row.revision,
  authorId: row.author_id,
  createdAt: row.created_at,
});

/** Version metadata, newest first. */
export async function listVersions(documentId: string = DOCUMENT_ID): Promise<DocumentVersion[]> {
  const db = await canvasDb();
  return simulate("listVersions", () => db.all<VersionRow>("SELECT * FROM versions WHERE document_id = ? ORDER BY revision DESC", [documentId]).map(toVersion));
}

/** A version's immutable snapshot. Rejects "Version not found" for unknown IDs. */
export async function getVersion(versionId: string): Promise<DocumentVersionSnapshot> {
  const db = await canvasDb();
  return simulate("getVersion", () => {
    const row = db.get<VersionRow>("SELECT * FROM versions WHERE id = ?", [versionId]);
    if (!row) throw new Error("Version not found");
    return { ...toVersion(row), artboards: JSON.parse(row.artboards) };
  });
}

/** Mock control: a teammate saves a newer revision (renames the Home artboard). */
export async function simulateTeammateSave(): Promise<DesignDocument> {
  const db = await canvasDb();
  const current = readDocument(db, DOCUMENT_ID);
  const artboards = current.artboards.map((a) => (a.id === "ab-home" ? { ...a, name: `${a.name.replace(/ \(v\d+\)$/, "")} (v${current.revision + 1})` } : a));
  return write(db, DOCUMENT_ID, artboards, "ravi", null);
}

export function failNextSave(): void {
  network.failNext("saveDocument");
}

export function failNextDocumentLoad(): void {
  network.failNext("getDocument");
}

export async function resetCanvasData(): Promise<void> {
  await (await canvasDb()).reset();
}
