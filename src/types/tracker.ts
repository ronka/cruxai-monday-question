export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "canceled";
/** 0 = no priority, 1 = urgent … 4 = low (Linear's convention). */
export type Priority = 0 | 1 | 2 | 3 | 4;

export interface User {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Project {
  id: string;
  /** Issue identifier prefix, e.g. "WEB" → WEB-12. */
  key: string;
  name: string;
  color: string;
}

export interface Issue {
  id: string;
  /** Human identifier, e.g. "WEB-12". Unique across projects. */
  identifier: string;
  projectId: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: Priority;
  assigneeId: string | null;
  /** Story points. Null means unestimated. */
  estimate: number | null;
  archivedAt: string | null;
  /** Cycle the issue is planned into, or null. */
  cycleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueHistoryEntry {
  id: string;
  issueId: string;
  actorId: string;
  field: string;
  from: string | null;
  to: string | null;
  at: string;
}

export type IssuePatch = Partial<Pick<Issue, "title" | "description" | "status" | "priority" | "assigneeId" | "estimate" | "projectId" | "cycleId">>;

export type TrackerEvent = { type: "issue"; issueId: string } | { type: "deleted"; issueId: string };

export interface Cycle {
  id: string;
  number: number;
  /** Inclusive start, exclusive end (ISO timestamps). */
  startsAt: string;
  endsAt: string;
  /** Set when the cycle has been closed. */
  closedAt: string | null;
}
