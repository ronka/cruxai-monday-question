import { baseTree, commit1, commit2, CURRENT_USER, PULL, seedComments, type CommitFixture, type Tree } from "@/data/reviewData";
import { clock, HOUR } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { ChangedFile, Commit, PullRequest, ReviewComment, ReviewEvent } from "@/types/review";

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
  created_at TEXT NOT NULL
);
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
        db.run("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
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

type CommentRow = { id: string; file_id: string; path: string; line: number; side: "new" | "old"; body: string; author: string; commit_sha: string; line_text: string; created_at: string };
function toComment(db: LocalDatabase, row: CommentRow): ReviewComment {
  const head = treeAt(db, headCommit(db).sha);
  const content = row.side === "new" ? head[row.file_id]?.content : baseTree[row.file_id]?.content;
  const outdated = content === undefined || content.split("\n")[row.line - 1] !== row.line_text;
  return { id: row.id, fileId: row.file_id, path: row.path, line: row.line, side: row.side, body: row.body, author: row.author, commitSha: row.commit_sha, createdAt: row.created_at, outdated };
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
    db.run("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, input.fileId, file.path, input.line, input.side, input.body.trim(), CURRENT_USER, head.sha, text, clock.date().toISOString()]);
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
  db.run("INSERT INTO comments VALUES (?, ?, ?, 1, 'new', ?, 'yuki', ?, ?, ?)", [id, file.fileId, file.path, "Small nit: can we add a short header comment here?", head.sha, file.headContent.split("\n")[0], clock.date().toISOString()]);
  events.emit({ type: "comment", commentId: id });
}

export function failNextPublish(): void {
  network.failNext("publishComment");
}

export async function resetReviewData(): Promise<void> {
  await (await reviewDb()).reset();
}
