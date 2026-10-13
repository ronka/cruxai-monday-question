import type { IssueStatus, Priority, Project, User } from "@/types/tracker";

export const currentUserId = "noa";
export const users: User[] = [
  { id: "noa", name: "Noa Levi", initials: "NL", color: "#6e56cf" },
  { id: "omar", name: "Omar Haddad", initials: "OH", color: "#0f8b8d" },
  { id: "priya", name: "Priya Raman", initials: "PR", color: "#e5484d" },
  { id: "liam", name: "Liam Novak", initials: "LN", color: "#f76b15" },
  { id: "zoe", name: "Zoe Kim", initials: "ZK", color: "#30a46c" },
  /** Bot account that files customer reports into triage. */
  { id: "support", name: "Support bot", initials: "SB", color: "#71717a" },
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

/** Not a board column: triage issues live outside project boards. */
export const TRIAGE_STATUS = { id: "triage" as const, label: "Triage", color: "#f76b15" };

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

/** Incoming customer reports waiting in triage: [project, title, reporter, body]. */
export const seedTriage: [string, string, string, string][] = [
  ["web", "Can't save settings after changing workspace name", "dana@acme.io", "Clicking Save does nothing. No error. Chrome 129."],
  ["api", "Webhooks arriving twice", "ops@globex.com", "We see duplicate deliveries for issue.updated about once an hour."],
  ["mob", "App crashes opening a link from email", "kai@initech.dev", "Tapping an issue link from a notification email crashes the iOS app."],
  ["web", "Command menu shortcut conflicts with browser", "lee@umbrella.co", "Cmd+K opens the browser search bar in Firefox instead of the menu."],
  ["api", "Rate limit too strict for CI", "build@hooli.xyz", "Our CI hits 429 when syncing 300 issues. Can the limit be raised?"],
  ["web", "Screen flickers switching between workspaces", "sam@stark.ind", "Looks like the same bug as the workspace switch flicker."],
];

export const incomingReports: [string, string, string, string][] = [
  ["mob", "Push notifications stopped after update", "ivy@wayne.ent", "No pushes since 4.2.0 on Android 14."],
  ["web", "Export to CSV missing assignee column", "max@cyberdyne.ai", "The exported file has no assignee data."],
  ["api", "Search endpoint returns archived issues", "ana@soylent.co", "GET /v1/search includes archived issues."],
  ["web", "Typo in onboarding email", "joe@vandelay.com", "The welcome email says 'recieve'."],
  ["mob", "Dark mode text unreadable on issue detail", "eve@tyrell.corp", "Grey on grey in the description."],
];
