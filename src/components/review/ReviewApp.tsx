"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCode2, FileDiff as FileDiffIcon, GitCommit, GitPullRequest, MessageSquare } from "lucide-react";
import {
  failNextPublish,
  getChangedFiles,
  getPullRequest,
  listComments,
  publishComment,
  resetReviewData,
  simulatePush,
  simulateTeammateComment,
  subscribeToReview,
} from "@/api/reviewApi";
import { CURRENT_USER, users } from "@/data/reviewData";
import { MockControls } from "@/mock/MockControls";
import type { ReviewComment } from "@/types/review";
import { FileDiff, type LineRef } from "./FileDiff";

function Avatar({ login, size = 20 }: { login: string; size?: number }) {
  const user = users.find((u) => u.login === login);
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.45, background: user?.color ?? "#57606a" }}>
      {(user?.name ?? login).slice(0, 1)}
    </span>
  );
}

export function CommentCard({ comment }: { comment: ReviewComment }) {
  return (
    <div className="rounded-md border border-neutral-300 text-[13px]">
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-[#f6f8fa] px-3 py-1.5">
        <Avatar login={comment.author} />
        <strong>{comment.author}</strong>
        <span className="text-neutral-500">{new Date(comment.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        {comment.outdated && <span className="rounded-full border border-neutral-300 px-1.5 text-[11px] text-neutral-600">Outdated</span>}
      </div>
      <p className="whitespace-pre-wrap px-3 py-2">{comment.body}</p>
    </div>
  );
}

export function ReviewApp() {
  const queryClient = useQueryClient();
  const pr = useQuery({ queryKey: ["pr"], queryFn: getPullRequest });
  const files = useQuery({ queryKey: ["files", pr.data?.headSha], queryFn: () => getChangedFiles(pr.data!.headSha), enabled: !!pr.data });
  const comments = useQuery({ queryKey: ["comments"], queryFn: listComments });
  const [activeLine, setActiveLine] = useState<LineRef | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(
    () =>
      subscribeToReview(() => {
        void queryClient.invalidateQueries({ queryKey: ["pr"] });
        void queryClient.invalidateQueries({ queryKey: ["comments"] });
      }),
    [queryClient],
  );

  async function submitSingle() {
    if (!activeLine) return;
    setBusy(true);
    setError("");
    try {
      await publishComment({ ...activeLine, body: draft });
      setDraft("");
      setActiveLine(null);
      await queryClient.invalidateQueries({ queryKey: ["comments"] });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const composer = (
    <div className="rounded-md border border-neutral-300 p-2">
      <textarea
        autoFocus
        aria-label="Comment"
        placeholder="Leave a comment"
        className="h-20 w-full resize-y rounded-md border border-neutral-300 bg-[#f6f8fa] p-2 text-[13px] outline-none focus:border-[#0969da] focus:bg-white"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {error && <p role="alert" className="text-[12px] text-[#cf222e]">{error}</p>}
      <div className="mt-1 flex justify-end gap-2 text-[13px]">
        <button type="button" className="rounded-md border border-neutral-300 px-3 py-1" onClick={() => { setActiveLine(null); setDraft(""); setError(""); }}>Cancel</button>
        <button type="button" disabled={busy || !draft.trim()} className="rounded-md bg-[#1f883d] px-3 py-1 font-medium text-white disabled:opacity-50" onClick={() => void submitSingle()}>
          {busy ? "Publishing…" : "Add single comment"}
        </button>
      </div>
    </div>
  );

  const allComments = comments.data ?? [];
  return (
    <div className="min-h-dvh bg-white text-[14px] text-[#1f2328] [font-family:-apple-system,'Segoe_UI','Noto_Sans',Helvetica,Arial,sans-serif]">
      <header className="flex items-center gap-3 bg-[#f6f8fa] px-6 py-3 text-[14px] shadow-[inset_0_-1px_0_#d1d9e0]">
        <GitPullRequest className="h-6 w-6" />
        <span className="text-neutral-600">northwind / <strong className="text-[#1f2328]">public-api</strong></span>
        <span className="ml-auto flex items-center gap-2"><Avatar login={CURRENT_USER} size={24} /></span>
      </header>
      {pr.data && (
        <div className="mx-auto max-w-[1280px] px-6">
          <h1 className="mt-6 text-[26px] font-normal">
            {pr.data.title} <span className="font-light text-neutral-500">#{pr.data.number}</span>
          </h1>
          <p className="mt-2 flex items-center gap-2 text-neutral-600">
            <span className="flex items-center gap-1 rounded-full bg-[#1f883d] px-3 py-1 text-[13px] font-medium text-white"><GitPullRequest className="h-4 w-4" /> Open</span>
            <strong>{pr.data.author}</strong> wants to merge {pr.data.commits.length} commit{pr.data.commits.length > 1 && "s"} into
            <code className="rounded bg-[#ddf4ff] px-1.5 text-[12px] text-[#0969da]">{pr.data.baseRef}</code> from
            <code className="rounded bg-[#ddf4ff] px-1.5 text-[12px] text-[#0969da]">{pr.data.headRef}</code>
          </p>
          <nav className="mt-4 flex gap-1 border-b border-neutral-300 text-[14px]">
            <span className="flex items-center gap-2 px-4 py-2 text-neutral-600"><MessageSquare className="h-4 w-4" /> Conversation <span className="rounded-full bg-neutral-200 px-1.5 text-[12px]">{allComments.length}</span></span>
            <span className="flex items-center gap-2 px-4 py-2 text-neutral-600"><GitCommit className="h-4 w-4" /> Commits <span className="rounded-full bg-neutral-200 px-1.5 text-[12px]">{pr.data.commits.length}</span></span>
            <span className="flex items-center gap-2 border-b-2 border-[#fd8c73] px-4 py-2 font-semibold"><FileDiffIcon className="h-4 w-4" /> Files changed <span className="rounded-full bg-neutral-200 px-1.5 text-[12px]">{files.data?.length ?? "…"}</span></span>
          </nav>
          <div className="flex items-center gap-3 py-3 text-[13px] text-neutral-600">
            <span>Latest commit <code className="text-[#0969da]">{pr.data.headSha}</code> · {pr.data.commits.at(-1)?.message}</span>
          </div>
          <div className="flex gap-6 pb-24">
            <aside className="sticky top-4 w-64 shrink-0 self-start text-[13px]">
              {files.data?.map((file) => (
                <a key={file.fileId} href={`#file-${file.fileId}`} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[#f6f8fa]">
                  <FileCode2 className="h-4 w-4 text-neutral-500" />
                  <span className={`truncate ${file.status === "removed" ? "line-through" : ""}`}>{file.path.split("/").pop()}</span>
                </a>
              ))}
            </aside>
            <main className="min-w-0 flex-1 space-y-4">
              {files.isPending ? (
                <p role="status" className="text-neutral-500">Loading diff…</p>
              ) : files.isError ? (
                <p role="alert">Could not load the diff. <button className="underline" onClick={() => void files.refetch()}>Retry</button></p>
              ) : (
                files.data!.map((file) => (
                  <FileDiff
                    key={`${file.fileId}-${file.contentRevision}`}
                    file={file}
                    comments={allComments.filter((comment) => comment.fileId === file.fileId)}
                    activeLine={activeLine}
                    composer={composer}
                    onStartComment={(line) => { setActiveLine(line); setError(""); }}
                    renderComment={(comment) => <CommentCard key={comment.id} comment={comment} />}
                    collapsed={collapsed.has(file.fileId)}
                    onToggleCollapsed={() => setCollapsed((current) => { const next = new Set(current); if (next.has(file.fileId)) next.delete(file.fileId); else next.add(file.fileId); return next; })}
                  />
                ))
              )}
              {allComments.some((comment) => comment.outdated) && (
                <section className="rounded-md border border-neutral-300 p-3">
                  <h2 className="mb-2 text-[13px] font-semibold">Outdated comments</h2>
                  <div className="space-y-2">{allComments.filter((c) => c.outdated).map((comment) => <CommentCard key={comment.id} comment={comment} />)}</div>
                </section>
              )}
            </main>
          </div>
        </div>
      )}
      <MockControls
        sections={[
          {
            title: "Collaborators",
            actions: [
              { label: "Author pushes a new commit", run: simulatePush },
              { label: "Teammate publishes a comment", run: simulateTeammateComment },
            ],
          },
          { title: "Failures", actions: [{ label: "Fail next comment publish", run: failNextPublish }] },
        ]}
        onReset={resetReviewData}
      />
    </div>
  );
}
