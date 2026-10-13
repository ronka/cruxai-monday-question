import { baseTree, commit1, commit2, CURRENT_USER, PULL, seedComments, seedSuggestions, type CommitFixture, type Tree } from "@/data/reviewData";
import { clock, HOUR } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { ChangedFile, Commit, FileChange, PullRequest, ReviewComment, ReviewEvent, Suggestion } from "@/types/review";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE commits (
  sha TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  tree TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  path TEXT NOT NULL,
  line INTEGER NOT NULL,
  side TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  line_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  suggestion TEXT
);
CREATE TABLE commit_requests (idempotency_key TEXT PRIMARY KEY, sha TEXT NOT NULL);
`;

/** Commit fixtures that "Author pushes a new commit" appends, in order. */
export const PUSH_QUEUE: CommitFixture[] = [commit2];

export function reviewDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "pull-review",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      insertCommit(db, commit1, 0);
      seedComments.forEach(([fileId, line, side, author, body], index) => {
        const file = commit1.tree[fileId] ?? baseTree[fileId];
        db.run("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)", [
          `c-${index + 1}`,
          fileId,
          file.path,
          line,
          side,
          body,
          author,
          commit1.sha,
          file.content.split("\n")[line - 1] ?? "",
          new Date(clock.now() - (20 - index) * HOUR).toISOString(),
        ]);
      });
      seedSuggestions.forEach(([fileId, startLine, endLine, author, body, replacement], index) => {
        const lines = commit1.tree[fileId].content.split("\n");
        let originalLines = lines.slice(startLine - 1, endLine);
        if (fileId === "f-config") originalLines = ["    requestsPerMinute: 100,"]; // deliberately stale
        const suggestion: Suggestion = { startLine, endLine, replacement, originalLines };
        db.run("INSERT INTO comments VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)", [
          `s-${index + 1}`,
          fileId,
          commit1.tree[fileId].path,
          endLine,
          body,
          author,
          commit1.sha,
          lines[endLine - 1],
          new Date(clock.now() - (10 - index) * HOUR).toISOString(),
          JSON.stringify(suggestion),
        ]);
      });
    },
  });
}

function insertCommit(db: LocalDatabase, fixture: CommitFixture, position: number) {
  db.run("INSERT INTO commits VALUES (?, ?, ?, ?, ?, ?)", [
    fixture.sha,
    position,
    fixture.message,
    fixture.author,
    JSON.stringify(fixture.tree),
    new Date(clock.now() - fixture.ageHours * HOUR).toISOString(),
  ]);
}

const events = createEmitter<ReviewEvent>();
/** Live changes: pushes and newly published comments. */
export const subscribeToReview = events.subscribe;

type CommitRow = { sha: string; position: number; message: string; author: string; tree: string; created_at: string };
function commits(db: LocalDatabase): CommitRow[] {
  return db.all<CommitRow>("SELECT * FROM commits ORDER BY position");
}
function headCommit(db: LocalDatabase): CommitRow {
  return commits(db).at(-1)!;
}
function treeAt(db: LocalDatabase, sha: string): Tree {
  const row = db.get<CommitRow>("SELECT * FROM commits WHERE sha = ?", [sha]);
  if (!row) throw new Error(`Commit ${sha} not found`);
  return JSON.parse(row.tree);
}

/** Short, stable content hash used as a file's content revision. */
export function contentHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function changedFiles(head: Tree): ChangedFile[] {
  const ids = [...new Set([...Object.keys(baseTree), ...Object.keys(head)])];
  const files: ChangedFile[] = [];
  for (const fileId of ids) {
    const before = baseTree[fileId];
    const after = head[fileId];
    if (before && after && before.path === after.path && before.content === after.content) continue;
    const status = !before ? "added" : !after ? "removed" : before.path !== after.path ? "renamed" : "modified";
    files.push({
      fileId,
      path: (after ?? before).path,
      previousPath: status === "renamed" ? before.path : null,
      status,
      baseContent: before?.content ?? "",
      headContent: after?.content ?? "",
      contentRevision: contentHash(after?.content ?? ""),
    });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function getPullRequest(): Promise<PullRequest> {
  const db = await reviewDb();
  return simulate("getPullRequest", () => {
    const list = commits(db);
    return {
      ...PULL,
      state: "open",
      headSha: list.at(-1)!.sha,
      commits: list.map((row): Commit => ({ sha: row.sha, message: row.message, author: row.author, createdAt: row.created_at })),
    };
  });
}

/** Files changed between the base branch and `sha` (default: the head commit). */
export async function getChangedFiles(sha?: string): Promise<ChangedFile[]> {
  const db = await reviewDb();
  return simulate("getChangedFiles", () => changedFiles(treeAt(db, sha ?? headCommit(db).sha)));
}

type CommentRow = { id: string; file_id: string; path: string; line: number; side: "new" | "old"; body: string; author: string; commit_sha: string; line_text: string; created_at: string; suggestion: string | null };
function toComment(db: LocalDatabase, row: CommentRow): ReviewComment {
  const head = treeAt(db, headCommit(db).sha);
  const content = row.side === "new" ? head[row.file_id]?.content : baseTree[row.file_id]?.content;
  const outdated = content === undefined || content.split("\n")[row.line - 1] !== row.line_text;
  return {
    id: row.id,
    fileId: row.file_id,
    path: row.path,
    line: row.line,
    side: row.side,
    body: row.body,
    author: row.author,
    commitSha: row.commit_sha,
    createdAt: row.created_at,
    outdated,
    suggestion: row.suggestion ? JSON.parse(row.suggestion) : null,
  };
}

/** Published review comments. `outdated` is computed against the head commit. */
export async function listComments(): Promise<ReviewComment[]> {
  const db = await reviewDb();
  return simulate("listComments", () => db.all<CommentRow>("SELECT * FROM comments ORDER BY created_at").map((row) => toComment(db, row)));
}

/** Publishes a single comment immediately on a line of the head commit. */
export async function publishComment(input: { fileId: string; line: number; side: "new" | "old"; body: string }): Promise<ReviewComment> {
  const db = await reviewDb();
  return simulate("publishComment", () => {
    if (!input.body.trim()) throw new Error("Comment cannot be empty");
    const head = headCommit(db);
    const tree = treeAt(db, head.sha);
    const file = input.side === "new" ? tree[input.fileId] : baseTree[input.fileId];
    const text = file?.content.split("\n")[input.line - 1];
    if (!file || text === undefined) throw new Error("That line is not part of this diff");
    const id = newId("c-");
    db.run("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)", [id, input.fileId, file.path, input.line, input.side, input.body.trim(), CURRENT_USER, head.sha, text, clock.date().toISOString()]);
    events.emit({ type: "comment", commentId: id });
    return toComment(db, db.get<CommentRow>("SELECT * FROM comments WHERE id = ?", [id])!);
  });
}

/** Mock control: the author pushes the next queued commit. */
export async function simulatePush(): Promise<string> {
  const db = await reviewDb();
  const list = commits(db);
  const next = PUSH_QUEUE.find((fixture) => !list.some((row) => row.sha === fixture.sha));
  if (!next) throw new Error("No more commits to push");
  insertCommit(db, { ...next, ageHours: 0 }, list.length);
  db.run("UPDATE commits SET created_at = ? WHERE sha = ?", [clock.date().toISOString(), next.sha]);
  events.emit({ type: "push", headSha: next.sha });
  return next.sha;
}

/** Mock control: a teammate publishes a comment on the first changed line. */
export async function simulateTeammateComment(): Promise<void> {
  const db = await reviewDb();
  const head = headCommit(db);
  const file = changedFiles(treeAt(db, head.sha)).find((f) => f.status !== "removed")!;
  const id = newId("c-");
  db.run("INSERT INTO comments VALUES (?, ?, ?, 1, 'new', ?, 'yuki', ?, ?, ?, NULL)", [id, file.fileId, file.path, "Small nit: can we add a short header comment here?", head.sha, file.headContent.split("\n")[0], clock.date().toISOString()]);
  events.emit({ type: "comment", commentId: id });
}

/** Head (or `sha`) content of a file — the local file-content store. Rejects for removed files. */
export async function getFileContent(fileId: string, sha?: string): Promise<string> {
  const db = await reviewDb();
  return simulate("getFileContent", () => {
    const file = treeAt(db, sha ?? headCommit(db).sha)[fileId];
    if (!file) throw new Error("File not found in this commit");
    return file.content;
  });
}

/**
 * Mock commit adapter. Creates one commit on top of `parentSha` that replaces
 * the given files' contents, atomically. Rejects if the branch head moved.
 * Repeating a call with the same `idempotencyKey` returns the original commit
 * SHA instead of committing again.
 */
export async function createCommit(input: { parentSha: string; message: string; changes: FileChange[]; idempotencyKey: string }): Promise<{ sha: string }> {
  const db = await reviewDb();
  return simulate("createCommit", () => {
    const existing = db.get<{ sha: string }>("SELECT sha FROM commit_requests WHERE idempotency_key = ?", [input.idempotencyKey]);
    if (existing) return { sha: existing.sha };
    const head = headCommit(db);
    if (input.parentSha !== head.sha) throw new Error(`The branch moved: head is now ${head.sha}`);
    if (!input.changes.length) throw new Error("Nothing to commit");
    const tree = treeAt(db, head.sha);
    for (const change of input.changes) {
      if (!tree[change.fileId]) throw new Error(`File ${change.fileId} is not in the head commit`);
      tree[change.fileId] = { ...tree[change.fileId], content: change.content };
    }
    const sha = contentHash(`${head.sha}:${input.idempotencyKey}`).slice(0, 7);
    db.transaction(() => {
      insertCommit(db, { sha, message: input.message, author: CURRENT_USER, ageHours: 0, tree }, commits(db).length);
      db.run("UPDATE commits SET created_at = ? WHERE sha = ?", [clock.date().toISOString(), sha]);
      db.run("INSERT INTO commit_requests VALUES (?, ?)", [input.idempotencyKey, sha]);
    });
    events.emit({ type: "push", headSha: sha });
    return { sha };
  });
}

/** Mock control: the next createCommit applies, but the caller sees a timeout. */
export function loseNextCommitResponse(): void {
  network.loseNextResponse("createCommit");
}

export function failNextCommit(): void {
  network.failNext("createCommit");
}

export function failNextPublish(): void {
  network.failNext("publishComment");
}

export async function resetReviewData(): Promise<void> {
  await (await reviewDb()).reset();
}
