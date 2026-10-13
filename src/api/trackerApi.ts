import { currentUserId, descriptions, projects, seedIssues, users } from "@/data/trackerData";
import { clock, HOUR } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Issue, IssueHistoryEntry, IssuePatch, IssueStatus, Project, TrackerEvent } from "@/types/tracker";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  priority INTEGER NOT NULL,
  assignee_id TEXT,
  estimate REAL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE issue_history (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  field TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  at TEXT NOT NULL
);
CREATE TABLE counters (project_id TEXT PRIMARY KEY, next INTEGER NOT NULL);
`;

export function trackerDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "tracker",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const counts: Record<string, number> = {};
      seedIssues.forEach(([projectId, title, status, priority, assigneeId, estimate, archived], index) => {
        const project = projects.find((item) => item.id === projectId)!;
        counts[projectId] = (counts[projectId] ?? 0) + 1;
        const created = new Date(clock.now() - (seedIssues.length - index) * 9 * HOUR).toISOString();
        db.run("INSERT INTO issues VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          `i-${index + 1}`,
          `${project.key}-${counts[projectId]}`,
          projectId,
          title,
          descriptions[title] ?? "",
          status,
          priority,
          assigneeId,
          estimate,
          archived ? created : null,
          created,
          created,
        ]);
        db.run("INSERT INTO issue_history VALUES (?, ?, ?, 'created', NULL, ?, ?)", [
          `h-${index + 1}`,
          `i-${index + 1}`,
          assigneeId ?? currentUserId,
          status,
          created,
        ]);
      });
      for (const project of projects)
        db.run("INSERT INTO counters VALUES (?, ?)", [project.id, (counts[project.id] ?? 0) + 1]);
    },
  });
}

const events = createEmitter<TrackerEvent>();
/** Live changes, including simulated teammate edits. */
export const subscribeToTracker = events.subscribe;

type IssueRow = {
  id: string;
  identifier: string;
  project_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: number;
  assignee_id: string | null;
  estimate: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
export const toIssue = (row: IssueRow): Issue => ({
  id: row.id,
  identifier: row.identifier,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority as Issue["priority"],
  assigneeId: row.assignee_id,
  estimate: row.estimate,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function readIssue(db: LocalDatabase, id: string): Issue {
  const row = db.get<IssueRow>("SELECT * FROM issues WHERE id = ? OR identifier = ?", [id, id]);
  if (!row) throw new Error("Issue not found");
  return toIssue(row);
}

export async function listProjects(): Promise<Project[]> {
  return simulate("listProjects", () => projects);
}

/** Non-archived issues in a project. */
export async function getProjectIssues(projectId: string): Promise<Issue[]> {
  const db = await trackerDb();
  return simulate("getProjectIssues", () =>
    db
      .all<IssueRow>("SELECT * FROM issues WHERE project_id = ? AND archived_at IS NULL ORDER BY priority = 0, priority, created_at", [projectId])
      .map(toIssue),
  );
}

/** Looks up by ID or identifier (e.g. "WEB-3"). Archived issues are returned; deleted ones reject. */
export async function getIssue(idOrIdentifier: string): Promise<Issue> {
  const db = await trackerDb();
  return simulate("getIssue", () => readIssue(db, idOrIdentifier));
}

/** Searches titles and identifiers across all projects. */
export async function searchIssues(query: string, options: { includeArchived?: boolean } = {}): Promise<Issue[]> {
  const db = await trackerDb();
  return simulate("searchIssues", () => {
    const like = `%${query.trim()}%`;
    return db
      .all<IssueRow>(
        `SELECT * FROM issues WHERE (title LIKE ? OR identifier LIKE ?) ${options.includeArchived ? "" : "AND archived_at IS NULL"} ORDER BY updated_at DESC LIMIT 20`,
        [like, like],
      )
      .map(toIssue);
  });
}

export async function getIssueHistory(issueId: string): Promise<IssueHistoryEntry[]> {
  const db = await trackerDb();
  return simulate("getIssueHistory", () =>
    db
      .all<{ id: string; issue_id: string; actor_id: string; field: string; from_value: string | null; to_value: string | null; at: string }>(
        "SELECT * FROM issue_history WHERE issue_id = ? ORDER BY at, rowid",
        [issueId],
      )
      .map((row) => ({
        id: row.id,
        issueId: row.issue_id,
        actorId: row.actor_id,
        field: row.field,
        from: row.from_value,
        to: row.to_value,
        at: row.at,
      })),
  );
}

function applyPatch(db: LocalDatabase, id: string, patch: IssuePatch, actorId: string): Issue {
  const issue = readIssue(db, id);
  const now = clock.date().toISOString();
  const columns: Record<keyof IssuePatch, string> = {
    title: "title",
    description: "description",
    status: "status",
    priority: "priority",
    assigneeId: "assignee_id",
    estimate: "estimate",
    projectId: "project_id",
  };
  db.transaction(() => {
    for (const [key, value] of Object.entries(patch) as [keyof IssuePatch, unknown][]) {
      if (value === undefined || issue[key] === value) continue;
      db.run(`UPDATE issues SET ${columns[key]} = ?, updated_at = ? WHERE id = ?`, [value as string, now, issue.id]);
      db.run("INSERT INTO issue_history VALUES (?, ?, ?, ?, ?, ?, ?)", [
        newId("h-"),
        issue.id,
        actorId,
        key,
        issue[key] == null ? null : String(issue[key]),
        value == null ? null : String(value),
        now,
      ]);
    }
  });
  events.emit({ type: "issue", issueId: issue.id });
  return readIssue(db, issue.id);
}

/** Updates fields and records one history entry per changed field. */
export async function updateIssue(id: string, patch: IssuePatch): Promise<Issue> {
  const db = await trackerDb();
  return simulate("updateIssue", () => applyPatch(db, id, patch, currentUserId));
}

export async function createIssue(input: { projectId: string; title: string; status?: IssueStatus; priority?: Issue["priority"] }): Promise<Issue> {
  const db = await trackerDb();
  return simulate("createIssue", () => {
    const project = projects.find((item) => item.id === input.projectId);
    if (!project) throw new Error("Project not found");
    if (!input.title.trim()) throw new Error("Title is required");
    const id = newId("i-");
    const now = clock.date().toISOString();
    db.transaction(() => {
      const { next } = db.get<{ next: number }>("SELECT next FROM counters WHERE project_id = ?", [project.id])!;
      db.run("UPDATE counters SET next = next + 1 WHERE project_id = ?", [project.id]);
      db.run("INSERT INTO issues VALUES (?, ?, ?, ?, '', ?, ?, ?, NULL, NULL, ?, ?)", [
        id,
        `${project.key}-${next}`,
        project.id,
        input.title.trim(),
        input.status ?? "todo",
        input.priority ?? 0,
        currentUserId,
        now,
        now,
      ]);
      db.run("INSERT INTO issue_history VALUES (?, ?, ?, 'created', NULL, ?, ?)", [newId("h-"), id, currentUserId, input.status ?? "todo", now]);
    });
    events.emit({ type: "issue", issueId: id });
    return readIssue(db, id);
  });
}

export async function archiveIssue(id: string, archived = true): Promise<Issue> {
  const db = await trackerDb();
  return simulate("archiveIssue", () => {
    const issue = readIssue(db, id);
    const now = clock.date().toISOString();
    db.run("UPDATE issues SET archived_at = ?, updated_at = ? WHERE id = ?", [archived ? now : null, now, issue.id]);
    db.run("INSERT INTO issue_history VALUES (?, ?, ?, 'archived', ?, ?, ?)", [newId("h-"), issue.id, currentUserId, String(!archived), String(archived), now]);
    events.emit({ type: "issue", issueId: issue.id });
    return readIssue(db, issue.id);
  });
}

/** Permanently deletes an issue. Later reads reject with "Issue not found". */
export async function deleteIssue(id: string): Promise<void> {
  const db = await trackerDb();
  return simulate("deleteIssue", () => {
    const issue = readIssue(db, id);
    db.transaction(() => {
      db.run("DELETE FROM issues WHERE id = ?", [issue.id]);
      db.run("DELETE FROM issue_history WHERE issue_id = ?", [issue.id]);
    });
    events.emit({ type: "deleted", issueId: issue.id });
  });
}

/** Mock control: a teammate moves a random open issue in the project to the next status. */
export async function simulateTeammateStatusChange(projectId: string): Promise<Issue> {
  const db = await trackerDb();
  const rows = db.all<IssueRow>(
    "SELECT * FROM issues WHERE project_id = ? AND archived_at IS NULL AND status IN ('backlog','todo','in_progress','in_review')",
    [projectId],
  );
  if (rows.length === 0) throw new Error("No open issues");
  const row = rows[Math.floor(Math.random() * rows.length)];
  const order: IssueStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];
  const actor = users.find((user) => user.id !== currentUserId && user.id === row.assignee_id) ?? users[1];
  return applyPatch(db, row.id, { status: order[order.indexOf(row.status) + 1] }, actor.id);
}

export function failNextIssueUpdate(): void {
  network.failNext("updateIssue");
}

export async function resetTrackerData(): Promise<void> {
  await (await trackerDb()).reset();
  clock.reset();
}
