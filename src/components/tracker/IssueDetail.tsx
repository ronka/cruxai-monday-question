"use client";

import { useQuery } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { getIssue, getIssueHistory } from "@/api/trackerApi";
import { PRIORITIES, projects, STATUSES, users } from "@/data/trackerData";
import type { Issue, IssuePatch } from "@/types/tracker";
import { Avatar, StatusIcon } from "./bits";

interface Props {
  issueRef: string;
  onClose: () => void;
  onUpdate: (issue: Issue, patch: IssuePatch) => void;
  onArchive: (issue: Issue, archived: boolean) => void;
  onDelete: (issue: Issue) => void;
}

function describe(field: string, from: string | null, to: string | null) {
  const label = (value: string | null) => {
    if (value == null) return "none";
    if (field === "status") return STATUSES.find((s) => s.id === value)?.label ?? value;
    if (field === "priority") return PRIORITIES.find((p) => String(p.id) === value)?.label ?? value;
    if (field === "assigneeId") return users.find((u) => u.id === value)?.name ?? value;
    if (field === "projectId") return projects.find((p) => p.id === value)?.name ?? value;
    return value;
  };
  if (field === "created") return "created the issue";
  if (field === "archived") return to === "true" ? "archived the issue" : "restored the issue";
  if (field === "description") return "updated the description";
  return `changed ${field === "assigneeId" ? "assignee" : field} from ${label(from)} to ${label(to)}`;
}

/** Issue detail panel: properties, description, and activity history. */
export function IssueDetail({ issueRef, onClose, onUpdate, onArchive, onDelete }: Props) {
  const issueQuery = useQuery({ queryKey: ["issue", issueRef], queryFn: () => getIssue(issueRef), retry: false });
  const issue = issueQuery.data;
  const historyQuery = useQuery({
    queryKey: ["history", issue?.id],
    queryFn: () => getIssueHistory(issue!.id),
    enabled: !!issue,
  });
  const select = "w-full rounded border border-transparent bg-transparent px-1.5 py-1 hover:border-zinc-200 focus:border-violet-400 outline-none";

  return (
    <aside aria-label="Issue details" className="flex w-[440px] shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 text-[13px] text-zinc-500">
        <span>{issue?.identifier ?? issueRef}</span>
        <div className="flex items-center gap-1">
          {issue && (
            <>
              <button type="button" title={issue.archivedAt ? "Restore" : "Archive"} aria-label={issue.archivedAt ? "Restore issue" : "Archive issue"} className="rounded p-1 hover:bg-zinc-100" onClick={() => onArchive(issue, !issue.archivedAt)}>
                {issue.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button type="button" title="Delete" aria-label="Delete issue" className="rounded p-1 hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(issue)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button type="button" aria-label="Close" className="rounded p-1 hover:bg-zinc-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {issueQuery.isPending ? (
        <p role="status" className="p-6 text-[13px] text-zinc-400">Loading issue…</p>
      ) : !issue ? (
        <p role="alert" className="p-6 text-[13px] text-zinc-500">This issue doesn’t exist or was deleted.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {issue.archivedAt && (
            <p className="bg-amber-50 px-6 py-2 text-[12px] text-amber-800">Archived {new Date(issue.archivedAt).toLocaleDateString("en-US")}</p>
          )}
          <div className="px-6 py-5">
            <input
              key={`${issue.id}-title`}
              aria-label="Title"
              defaultValue={issue.title}
              className="mb-2 w-full text-xl font-semibold text-zinc-900 outline-none"
              onBlur={(event) => event.target.value.trim() && event.target.value !== issue.title && onUpdate(issue, { title: event.target.value.trim() })}
            />
            <textarea
              key={`${issue.id}-description`}
              aria-label="Description"
              placeholder="Add description…"
              defaultValue={issue.description}
              rows={3}
              className="w-full resize-none text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400"
              onBlur={(event) => event.target.value !== issue.description && onUpdate(issue, { description: event.target.value })}
            />
          </div>
          <dl className="grid grid-cols-[96px_1fr] items-center gap-x-2 gap-y-1 border-y border-zinc-100 px-6 py-4 text-[13px]">
            <dt className="text-zinc-500">Status</dt>
            <dd className="flex items-center gap-1">
              <StatusIcon status={issue.status} />
              <select aria-label="Status" className={select} value={issue.status} onChange={(e) => onUpdate(issue, { status: e.target.value as Issue["status"] })}>
                {issue.status === "triage" && <option value="triage">Triage</option>}
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </dd>
            <dt className="text-zinc-500">Priority</dt>
            <dd>
              <select aria-label="Priority" className={select} value={issue.priority} onChange={(e) => onUpdate(issue, { priority: Number(e.target.value) as Issue["priority"] })}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </dd>
            <dt className="text-zinc-500">Assignee</dt>
            <dd className="flex items-center gap-1">
              <Avatar userId={issue.assigneeId} />
              <select aria-label="Assignee" className={select} value={issue.assigneeId ?? ""} onChange={(e) => onUpdate(issue, { assigneeId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </dd>
            <dt className="text-zinc-500">Estimate</dt>
            <dd>
              <select aria-label="Estimate" className={select} value={issue.estimate ?? ""} onChange={(e) => onUpdate(issue, { estimate: e.target.value === "" ? null : Number(e.target.value) })}>
                <option value="">No estimate</option>
                {[1, 2, 3, 5, 8].map((points) => <option key={points} value={points}>{points} points</option>)}
              </select>
            </dd>
            <dt className="text-zinc-500">Project</dt>
            <dd className="px-1.5 py-1">{projects.find((p) => p.id === issue.projectId)?.name}</dd>
          </dl>
          <section className="px-6 py-4">
            <h3 className="mb-3 text-[13px] font-medium text-zinc-700">Activity</h3>
            <ol className="space-y-2.5">
              {historyQuery.data?.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 text-[12px] text-zinc-500">
                  <Avatar userId={entry.actorId} size={16} />
                  <span>
                    <strong className="font-medium text-zinc-700">{users.find((u) => u.id === entry.actorId)?.name}</strong>{" "}
                    {describe(entry.field, entry.from, entry.to)} ·{" "}
                    {new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </aside>
  );
}
