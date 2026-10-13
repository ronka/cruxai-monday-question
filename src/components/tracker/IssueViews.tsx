"use client";

import { useState } from "react";
import { STATUSES } from "@/data/trackerData";
import type { Issue, IssueStatus } from "@/types/tracker";
import { Avatar, PriorityIcon, StatusIcon } from "./bits";

interface ViewProps {
  issues: Issue[];
  selectedId: string | null;
  onSelect: (issue: Issue) => void;
}

/** Issues grouped by status, Linear-style list rows. */
export function IssueList({ issues, selectedId, onSelect }: ViewProps) {
  return (
    <div>
      {STATUSES.map((status) => {
        const group = issues.filter((issue) => issue.status === status.id);
        if (group.length === 0) return null;
        return (
          <section key={status.id}>
            <h2 className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-6 py-1.5 text-[13px] font-medium text-zinc-700">
              <StatusIcon status={status.id} /> {status.label}
              <span className="text-zinc-400">{group.length}</span>
            </h2>
            {group.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => onSelect(issue)}
                className={`flex w-full items-center gap-3 border-b border-zinc-100 px-6 py-2 text-left text-[13px] hover:bg-zinc-50 ${selectedId === issue.id ? "bg-violet-50" : ""}`}
              >
                <PriorityIcon priority={issue.priority} />
                <span className="w-16 shrink-0 text-zinc-500">{issue.identifier}</span>
                <StatusIcon status={issue.status} />
                <span className="flex-1 truncate text-zinc-900">{issue.title}</span>
                {issue.estimate != null && <span className="rounded border border-zinc-200 px-1 text-[11px] text-zinc-500">{issue.estimate}</span>}
                <span className="w-14 text-right text-[12px] text-zinc-400">
                  {new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <Avatar userId={issue.assigneeId} />
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

interface BoardProps extends ViewProps {
  onMove: (issue: Issue, status: IssueStatus) => void;
}

/** Board with one column per status. Drag a card to another column to change its status. */
export function IssueBoard({ issues, selectedId, onSelect, onMove }: BoardProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<IssueStatus | null>(null);
  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {STATUSES.map((status) => {
        const column = issues.filter((issue) => issue.status === status.id);
        return (
          <section
            key={status.id}
            aria-label={status.label}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(status.id);
            }}
            onDragLeave={() => setOver((current) => (current === status.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const issue = issues.find((item) => item.id === event.dataTransfer.getData("text/issue-id"));
              setOver(null);
              setDragging(null);
              if (issue && issue.status !== status.id) onMove(issue, status.id);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-lg ${over === status.id ? "bg-violet-50 ring-1 ring-violet-300" : "bg-zinc-100/70"}`}
          >
            <h2 className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-zinc-700">
              <StatusIcon status={status.id} /> {status.label}
              <span className="text-zinc-400">{column.length}</span>
            </h2>
            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {column.map((issue) => (
                <article
                  key={issue.id}
                  draggable
                  tabIndex={0}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/issue-id", issue.id);
                    setDragging(issue.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => onSelect(issue)}
                  onKeyDown={(event) => event.key === "Enter" && onSelect(issue)}
                  className={`cursor-pointer rounded-md border bg-white p-3 text-[13px] shadow-sm hover:border-zinc-300 ${selectedId === issue.id ? "border-violet-400" : "border-zinc-200"} ${dragging === issue.id ? "opacity-40" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between text-[12px] text-zinc-500">
                    {issue.identifier}
                    <Avatar userId={issue.assigneeId} />
                  </div>
                  <p className="mb-2 flex gap-1.5 text-zinc-900">
                    <span className="mt-0.5">
                      <StatusIcon status={issue.status} />
                    </span>
                    {issue.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-zinc-200 px-1 py-0.5">
                      <PriorityIcon priority={issue.priority} />
                    </span>
                    {issue.estimate != null && (
                      <span className="rounded border border-zinc-200 px-1.5 text-[11px] text-zinc-500">{issue.estimate} pts</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
