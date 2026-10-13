import type { IssueStatus, Priority, Project, User } from "@/types/tracker";

export const currentUserId = "noa";
export const users: User[] = [
  { id: "noa", name: "Noa Levi", initials: "NL", color: "#6e56cf" },
  { id: "omar", name: "Omar Haddad", initials: "OH", color: "#0f8b8d" },
  { id: "priya", name: "Priya Raman", initials: "PR", color: "#e5484d" },
  { id: "liam", name: "Liam Novak", initials: "LN", color: "#f76b15" },
  { id: "zoe", name: "Zoe Kim", initials: "ZK", color: "#30a46c" },
];

export const projects: Project[] = [
  { id: "web", key: "WEB", name: "Web app", color: "#6e56cf" },
  { id: "api", key: "API", name: "Public API", color: "#0f8b8d" },
  { id: "mob", key: "MOB", name: "Mobile", color: "#f76b15" },
];

export const STATUSES: { id: IssueStatus; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "#a1a1aa" },
  { id: "todo", label: "Todo", color: "#71717a" },
  { id: "in_progress", label: "In Progress", color: "#f5a524" },
  { id: "in_review", label: "In Review", color: "#30a46c" },
  { id: "done", label: "Done", color: "#6e56cf" },
  { id: "canceled", label: "Canceled", color: "#a1a1aa" },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 0, label: "No priority" },
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
];

type Seed = [project: string, title: string, status: IssueStatus, priority: Priority, assignee: string | null, estimate: number | null, archived?: boolean];
export const seedIssues: Seed[] = [
  ["web", "Redesign settings navigation", "in_progress", 2, "noa", 3],
  ["web", "Keyboard shortcut for command menu", "todo", 3, "zoe", 1],
  ["web", "Fix flicker when switching workspaces", "in_review", 1, "omar", 2],
  ["web", "Empty state for archived projects", "backlog", 4, null, 1],
  ["web", "Migrate date pickers to new component", "todo", 3, "liam", 5],
  ["web", "Bulk-select issues with shift-click", "backlog", 3, null, 3],
  ["web", "Inline image previews in comments", "done", 2, "zoe", 2],
  ["web", "Drag issues between sidebar projects", "canceled", 4, "noa", 3],
  ["web", "Legacy invite modal cleanup", "done", 4, "liam", 1, true],
  ["api", "Rate-limit headers on all endpoints", "in_progress", 2, "omar", 3],
  ["api", "Webhook retries with exponential backoff", "todo", 1, "priya", 5],
  ["api", "Paginate /issues with cursors", "in_review", 2, "priya", 3],
  ["api", "Deprecate v1 search endpoint", "backlog", 3, null, 2],
  ["api", "OAuth scopes for read-only tokens", "todo", 2, "omar", 3],
  ["api", "Return archived issues behind a flag", "backlog", 4, null, 1],
  ["api", "Fix 500 on empty label filter", "done", 1, "priya", 1],
  ["mob", "Offline queue for issue edits", "in_progress", 1, "liam", 8],
  ["mob", "Push notification settings screen", "todo", 3, "zoe", 3],
  ["mob", "Swipe to change status", "backlog", 3, null, 2],
  ["mob", "Crash when opening deep link to deleted issue", "todo", 1, "liam", 2],
  ["mob", "Dark mode contrast fixes", "in_review", 4, "zoe", 1],
  ["mob", "Old onboarding carousel", "canceled", 4, null, null, true],
];

export const descriptions: Record<string, string> = {
  "Webhook retries with exponential backoff":
    "Deliveries that fail with 5xx should retry up to 8 times with jittered backoff. Needs the rate-limit work first.",
  "Paginate /issues with cursors": "Offset pagination breaks when issues move between pages. Switch to opaque cursors.",
  "Offline queue for issue edits": "Queue edits made offline and replay them in order when the connection returns.",
};

/** Two-week cycles. With the default mock clock (Oct 13), cycle 12 is current. */
export const seedCycles = [
  { id: "c-12", number: 12, startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-19T00:00:00.000Z" },
  { id: "c-13", number: 13, startsAt: "2026-10-19T00:00:00.000Z", endsAt: "2026-11-02T00:00:00.000Z" },
];
/** Seeded cycle assignments by issue title. */
export const seedCycleAssignments: Record<string, string> = {
  "Redesign settings navigation": "c-12",
  "Keyboard shortcut for command menu": "c-12",
  "Fix flicker when switching workspaces": "c-12",
  "Inline image previews in comments": "c-12",
  "Drag issues between sidebar projects": "c-12",
  "Rate-limit headers on all endpoints": "c-12",
  "Paginate /issues with cursors": "c-12",
  "Fix 500 on empty label filter": "c-12",
  "Offline queue for issue edits": "c-12",
  "Dark mode contrast fixes": "c-12",
  "Webhook retries with exponential backoff": "c-13",
  "Push notification settings screen": "c-13",
};
