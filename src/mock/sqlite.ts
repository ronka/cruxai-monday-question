// Browser SQLite adapter (sql.js). The database lives in memory and its bytes
// are saved to IndexedDB after every write, so data survives a refresh. Where
// IndexedDB is unavailable (tests, private windows) it stays in memory.
//
// This is local storage for one browser, not a shared server.
import { STORAGE_NAMESPACE } from "./namespace";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";

export type Row = Record<string, SqlValue>;

export interface DatabaseOptions {
  /** Storage key. Bump `version` to discard incompatible saved data. */
  name: string;
  version: number;
  /** CREATE TABLE statements. */
  schema: string;
  /** Inserts the starting fixtures into an empty database. */
  seed: (db: LocalDatabase) => void;
}

export interface LocalDatabase {
  all<T = Row>(sql: string, params?: SqlValue[]): T[];
  get<T = Row>(sql: string, params?: SqlValue[]): T | undefined;
  run(sql: string, params?: SqlValue[]): void;
  /** Runs `work` atomically; any thrown error rolls back every statement. */
  transaction<T>(work: () => T): T;
  /** Saves the current bytes to IndexedDB. Called after every write. */
  persist(): Promise<void>;
  /** Drops saved data and reseeds. */
  reset(): Promise<void>;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let locateFile = (file: string) => `/${file}`;

/** Tests point this at node_modules; the browser loads /sql-wasm.wasm. */
export function configureSqlite(options: { locateFile: (file: string) => string }) {
  locateFile = options.locateFile;
  sqlPromise = null;
}

function loadSql() {
  sqlPromise ??= initSqlJs({ locateFile });
  return sqlPromise;
}

const IDB_NAME = "mock-sqlite";
const IDB_STORE = "databases";

let connection: Promise<IDBDatabase | null> | null = null;

// One shared connection keeps snapshot writes in the order they were issued.
function idb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  connection ??= new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return connection;
}

async function readBytes(key: string): Promise<Uint8Array | null> {
  const store = await idb();
  if (!store) return null;
  return new Promise((resolve) => {
    const request = store.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
    request.onsuccess = () => resolve((request.result as Uint8Array) ?? null);
    request.onerror = () => resolve(null);
  });
}

async function writeBytes(key: string, bytes: Uint8Array | null): Promise<void> {
  const store = await idb();
  if (!store) return;
  await new Promise<void>((resolve) => {
    const tx = store.transaction(IDB_STORE, "readwrite");
    if (bytes) tx.objectStore(IDB_STORE).put(bytes, key);
    else tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

const opened = new Map<string, Promise<LocalDatabase>>();

/** Opens (once per page) the named database, seeding it when empty. */
export function openDatabase(options: DatabaseOptions): Promise<LocalDatabase> {
  const key = `${STORAGE_NAMESPACE}/${options.name}@${options.version}`;
  let promise = opened.get(key);
  if (!promise) {
    promise = create(options, key);
    opened.set(key, promise);
  }
  return promise;
}

async function create(options: DatabaseOptions, key: string): Promise<LocalDatabase> {
  const SQL = await loadSql();
  let db: Database;
  let depth = 0;

  const local: LocalDatabase = {
    all<T>(sql: string, params: SqlValue[] = []) {
      const statement = db.prepare(sql);
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      statement.free();
      return rows;
    },
    get<T>(sql: string, params: SqlValue[] = []) {
      return local.all<T>(sql, params)[0];
    },
    run(sql: string, params: SqlValue[] = []) {
      db.run(sql, params);
      if (depth === 0) void local.persist();
    },
    transaction<T>(work: () => T): T {
      const savepoint = `sp${depth}`;
      db.run(`SAVEPOINT ${savepoint}`);
      depth += 1;
      try {
        const result = work();
        depth -= 1;
        db.run(`RELEASE ${savepoint}`);
        if (depth === 0) void local.persist();
        return result;
      } catch (error) {
        depth -= 1;
        db.run(`ROLLBACK TO ${savepoint}`);
        db.run(`RELEASE ${savepoint}`);
        throw error;
      }
    },
    persist() {
      return writeBytes(key, db.export());
    },
    async reset() {
      db.close();
      await writeBytes(key, null);
      fresh();
      await local.persist();
    },
  };

  function fresh() {
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON");
    db.run(options.schema);
    local.transaction(() => options.seed(local));
  }

  const saved = await readBytes(key);
  if (saved) {
    db = new SQL.Database(saved);
    db.run("PRAGMA foreign_keys = ON");
  } else {
    fresh();
  }
  return local;
}
