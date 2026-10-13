"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Kanban, Layers, List, Plus, Search, SquarePen, UserRound } from "lucide-react";
import {
  archiveIssue,
  createIssue,
  deleteIssue,
  failNextIssueUpdate,
  getProjectIssues,
  listProjects,
  resetTrackerData,
  simulateTeammateStatusChange,
  subscribeToTracker,
  updateIssue,
} from "@/api/trackerApi";
import { currentUserId, users } from "@/data/trackerData";
import { clock } from "@/mock/clock";
import { MockControls } from "@/mock/MockControls";
import type { Issue, IssuePatch } from "@/types/tracker";
import { Avatar } from "./bits";
import { IssueDetail } from "./IssueDetail";
import { IssueBoard, IssueList } from "./IssueViews";

type View = "list" | "board";

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    project: params.get("project") ?? "web",
    view: (params.get("view") === "list" ? "list" : "board") as View,
    issue: params.get("issue"),
  };
}

export function TrackerApp() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("web");
  const [view, setView] = useState<View>("board");
  const [issueRef, setIssueRef] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const restore = () => {
      const url = readUrl();
      setProjectId(url.project);
      setView(url.view);
      setIssueRef(url.issue);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(
    () =>
      subscribeToTracker(() => {
        void queryClient.invalidateQueries({ queryKey: ["issues"] });
        void queryClient.invalidateQueries({ queryKey: ["issue"] });
        void queryClient.invalidateQueries({ queryKey: ["history"] });
      }),
    [queryClient],
  );

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const issuesQuery = useQuery({ queryKey: ["issues", projectId], queryFn: () => getProjectIssues(projectId) });
  const project = projectsQuery.data?.find((item) => item.id === projectId);
  const issues = issuesQuery.data ?? [];
  const selected = issues.find((issue) => issue.identifier === issueRef || issue.id === issueRef);

  function navigate(next: Partial<{ project: string; view: View; issue: string | null }>) {
    const state = { project: projectId, view, issue: issueRef, ...next };
    setProjectId(state.project);
    setView(state.view);
    setIssueRef(state.issue);
    const params = new URLSearchParams({ project: state.project, view: state.view });
    if (state.issue) params.set("issue", state.issue);
    window.history.pushState(null, "", `?${params}`);
  }

  async function update(issue: Issue, patch: IssuePatch) {
    setError("");
    const key = ["issues", issue.projectId];
    const previous = queryClient.getQueryData<Issue[]>(key);
    queryClient.setQueryData<Issue[]>(key, (list) => list?.map((item) => (item.id === issue.id ? { ...item, ...patch } : item)));
    try {
      await updateIssue(issue.id, patch);
    } catch (cause) {
      queryClient.setQueryData(key, previous);
      setError(`${issue.identifier}: ${(cause as Error).message}`);
    }
  }

  return (
    <div className="flex h-dvh bg-white text-[13px] text-zinc-800 [font-family:Inter,ui-sans-serif,-apple-system,'Segoe_UI',sans-serif]">
      <nav aria-label="Workspace" className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-zinc-200 bg-zinc-50 px-2 py-3">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 font-semibold text-zinc-900">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-600 text-[11px] text-white">N</span>
            Northwind
          </span>
          <span className="flex gap-2 text-zinc-500">
            <Search className="h-4 w-4" />
            <SquarePen className="h-4 w-4" />
          </span>
        </div>
        <span className="flex items-center gap-2 rounded px-2 py-1 text-zinc-600"><Inbox className="h-4 w-4" /> Inbox</span>
        <span className="flex items-center gap-2 rounded px-2 py-1 text-zinc-600"><UserRound className="h-4 w-4" /> My issues</span>
        <p className="mb-1 mt-4 px-2 text-[12px] font-medium text-zinc-400">Projects</p>
        {projectsQuery.data?.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate({ project: item.id, issue: null })}
            className={`flex items-center gap-2 rounded px-2 py-1 text-left ${item.id === projectId ? "bg-zinc-200/80 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-200/50"}`}
          >
            <Layers className="h-4 w-4" style={{ color: item.color }} /> {item.name}
          </button>
        ))}
        <div className="mt-auto flex items-center gap-2 px-2 text-zinc-500">
          <Avatar userId={currentUserId} /> {users.find((user) => user.id === currentUserId)?.name}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-2.5">
          <h1 className="flex items-center gap-2 font-medium text-zinc-900">
            <Layers className="h-4 w-4" style={{ color: project?.color }} /> {project?.name ?? "…"}
            <span className="font-normal text-zinc-400">{issues.length} issues</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-zinc-200 p-0.5" role="group" aria-label="Layout">
              {(["list", "board"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => navigate({ view: option })}
                  className={`flex items-center gap-1 rounded px-2 py-1 capitalize ${view === option ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"}`}
                >
                  {option === "list" ? <List className="h-3.5 w-3.5" /> : <Kanban className="h-3.5 w-3.5" />} {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 font-medium text-white hover:bg-violet-700"
              onClick={async () => {
                const title = window.prompt("Issue title");
                if (!title) return;
                const issue = await createIssue({ projectId, title });
                navigate({ issue: issue.identifier });
              }}
            >
              <Plus className="h-3.5 w-3.5" /> New issue
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-2 text-rose-700">
            {error} <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
          </p>
        )}
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-auto">
            {issuesQuery.isPending ? (
              <p role="status" className="p-6 text-zinc-400">Loading issues…</p>
            ) : issuesQuery.isError ? (
              <p role="alert" className="p-6 text-rose-700">
                Could not load issues. <button className="underline" onClick={() => void issuesQuery.refetch()}>Retry</button>
              </p>
            ) : view === "board" ? (
              <IssueBoard
                issues={issues}
                selectedId={selected?.id ?? null}
                onSelect={(issue) => navigate({ issue: issue.identifier })}
                onMove={(issue, status) => void update(issue, { status })}
              />
            ) : (
              <IssueList issues={issues} selectedId={selected?.id ?? null} onSelect={(issue) => navigate({ issue: issue.identifier })} />
            )}
          </main>
          {issueRef && (
            <IssueDetail
              issueRef={issueRef}
              onClose={() => navigate({ issue: null })}
              onUpdate={(issue, patch) => void update(issue, patch)}
              onArchive={async (issue, archived) => {
                await archiveIssue(issue.id, archived);
              }}
              onDelete={async (issue) => {
                if (!window.confirm(`Delete ${issue.identifier}? This cannot be undone.`)) return;
                await deleteIssue(issue.id);
                navigate({ issue: null });
              }}
            />
          )}
        </div>
      </div>
      <MockControls
        showClock
        sections={[
          {
            title: "Teammates",
            actions: [{ label: "Teammate advances an issue's status", run: () => simulateTeammateStatusChange(projectId) }],
          },
          {
            title: "Cycles",
            actions: [
              { label: "Jump to Oct 19 (cycle 12 has ended)", run: () => clock.set(Date.parse("2026-10-19T09:00:00Z")) },
            ],
          },
          { title: "Failures", actions: [{ label: "Fail next issue update", run: failNextIssueUpdate }] },
        ]}
        onReset={resetTrackerData}
      />
    </div>
  );
}
