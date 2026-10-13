"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Inbox, Mail, MapPin, RotateCcw, Search, Send } from "lucide-react";
import {
  addTag,
  countConversations,
  getDraft,
  removeTag,
  saveDraft,
  setPriority,
  failNextReply,
  getConversation,
  getCustomer,
  getMessages,
  listConversations,
  markRead,
  resetHelpdeskData,
  sendReply,
  setStatus,
  simulateAgentReply,
  simulateCustomerMessage,
  simulateNewConversation,
  subscribeToHelpdesk,
} from "@/api/helpdeskApi";
import { agents, customers, DEFAULT_AGENT_ID, tags } from "@/data/helpdeskData";
import { network } from "@/mock/network";
import { MockControls, useMockClock } from "@/mock/MockControls";
import type { ConversationStatus, Priority } from "@/types/helpdesk";

const timeAgo = (iso: string, now: number) => {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
    </span>
  );
}

export function HelpdeskApp() {
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID);
  const [view, setView] = useState<ConversationStatus>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const thread = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeToHelpdesk(() => {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["counts"] });
        void queryClient.invalidateQueries({ queryKey: ["conversation"] });
        void queryClient.invalidateQueries({ queryKey: ["messages"] });
      }),
    [queryClient],
  );
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("conversation");
    if (id) setSelectedId(id);
  }, []);

  const counts = useQuery({ queryKey: ["counts"], queryFn: countConversations });
  const list = useQuery({ queryKey: ["conversations", view, agentId], queryFn: () => listConversations(view, agentId) });
  const conversation = useQuery({ queryKey: ["conversation", selectedId, agentId], queryFn: () => getConversation(selectedId!, agentId), enabled: !!selectedId, retry: false });
  const messages = useQuery({ queryKey: ["messages", selectedId], queryFn: () => getMessages(selectedId!), enabled: !!selectedId });
  const customer = useQuery({ queryKey: ["customer", conversation.data?.customerId], queryFn: () => getCustomer(conversation.data!.customerId), enabled: !!conversation.data });
  const now = useMockClock();

  // Drafts are saved per agent and conversation, so they survive refreshes.
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void getDraft(selectedId, agentId).then((body) => active && setDrafts((d) => ({ ...d, [`${agentId}:${selectedId}`]: d[`${agentId}:${selectedId}`] ?? body })));
    return () => {
      active = false;
    };
  }, [selectedId, agentId]);
  const draftKey = selectedId ? `${agentId}:${selectedId}` : "";
  const draft = drafts[draftKey] ?? "";
  useEffect(() => {
    if (!selectedId || drafts[draftKey] === undefined) return;
    const timer = window.setTimeout(() => void saveDraft(selectedId, agentId, drafts[draftKey]), 400);
    return () => window.clearTimeout(timer);
  }, [drafts, draftKey, selectedId, agentId]);

  useEffect(() => {
    if (selectedId && conversation.data?.unread) void markRead(selectedId, agentId);
  }, [selectedId, agentId, conversation.data?.unread]);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages.data?.length, selectedId]);

  function open(id: string) {
    setSelectedId(id);
    setError("");
    window.history.replaceState(null, "", `?conversation=${id}`);
  }

  async function reply() {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendReply({ conversationId: selectedId, agentId, body: draft, clientId: crypto.randomUUID() });
      setDrafts((d) => ({ ...d, [draftKey]: "" }));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSending(false);
    }
  }

  const agent = agents.find((a) => a.id === agentId)!;
  return (
    <div className="flex h-dvh bg-[#f4f4f5] text-[14px] text-zinc-900 [font-family:Inter,ui-sans-serif,-apple-system,'Segoe_UI',sans-serif]">
      <nav aria-label="Inboxes" className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-[#fafafa] px-3 py-4">
        <div className="mb-5 flex items-center gap-2 px-2 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white">H</span> Helpdesk</div>
        <p className="mb-1 px-2 text-[12px] font-medium text-zinc-500">Inbox</p>
        {(["open", "closed"] as const).map((status) => (
          <button key={status} type="button" onClick={() => setView(status)} className={`flex items-center justify-between rounded-lg px-2 py-1.5 capitalize ${view === status ? "bg-white font-medium shadow-sm" : "text-zinc-600 hover:bg-zinc-100"}`}>
            <span className="flex items-center gap-2">{status === "open" ? <Inbox className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {status}</span>
            <span className="text-[12px] text-zinc-500">{counts.data?.[status] ?? ""}</span>
          </button>
        ))}
        <label className="mt-auto flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[13px]">
          <Avatar name={agent.name} color={agent.color} size={24} />
          <span className="sr-only">Signed in as</span>
          <select className="flex-1 bg-transparent outline-none" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </nav>

      <section aria-label="Conversations" className="flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h1 className="font-semibold capitalize">{view}</h1>
          <Search className="h-4 w-4 text-zinc-400" />
        </header>
        <div className="flex-1 overflow-y-auto">
          {list.isPending ? <p role="status" className="p-4 text-zinc-400">Loading…</p> : list.data!.length === 0 ? <p className="p-4 text-zinc-500">No {view} conversations.</p> : list.data!.map((c) => {
            const person = customers.find((cu) => cu.id === c.customerId)!;
            return (
              <button key={c.id} type="button" onClick={() => open(c.id)} className={`flex w-full gap-3 border-b border-zinc-100 px-4 py-3 text-left ${selectedId === c.id ? "bg-blue-50" : "hover:bg-zinc-50"}`}>
                <Avatar name={person.name} color={person.color} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate ${c.unread ? "font-semibold" : ""}`}>{person.name}</span>
                    <span className="shrink-0 text-[12px] text-zinc-400">{timeAgo(c.lastMessageAt, now)}</span>
                  </span>
                  <span className="block truncate text-[13px] text-zinc-700">{c.subject}</span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-[13px] ${c.unread ? "text-zinc-900" : "text-zinc-500"}`}>{c.preview}</span>
                    {c.unread && <span aria-label="Unread" className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {!selectedId ? (
          <div className="m-auto text-center text-zinc-500"><Inbox className="mx-auto mb-2 h-8 w-8" /> Select a conversation</div>
        ) : conversation.isError ? (
          <p role="alert" className="m-auto text-zinc-600">This conversation doesn’t exist.</p>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
              <div>
                <h2 className="font-semibold">{conversation.data?.subject ?? "…"}</h2>
                <p className="text-[12px] text-zinc-500">{customer.data?.name} · {conversation.data?.status}</p>
                {conversation.data && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <select
                      aria-label="Priority"
                      className="rounded-md border border-zinc-200 px-1.5 py-0.5"
                      value={conversation.data.priority}
                      onChange={(e) => void setPriority(conversation.data!.id, e.target.value as Priority, agentId).catch((c) => setError((c as Error).message))}
                    >
                      {["none", "low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>Priority: {p}</option>)}
                    </select>
                    {conversation.data.tagIds.map((id) => {
                      const tag = tags.find((t) => t.id === id)!;
                      return (
                        <button key={id} type="button" title="Remove tag" onClick={() => void removeTag(conversation.data!.id, id, agentId)} className="rounded-full px-2 py-0.5 text-white" style={{ background: tag.color }}>
                          {tag.name} ×
                        </button>
                      );
                    })}
                    <select aria-label="Add tag" className="rounded-md border border-dashed border-zinc-300 px-1.5 py-0.5 text-zinc-500" value="" onChange={(e) => e.target.value && void addTag(conversation.data!.id, e.target.value, agentId).catch((c) => setError((c as Error).message))}>
                      <option value="">+ Tag</option>
                      {tags.filter((t) => !conversation.data!.tagIds.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {conversation.data && (
                <button
                  type="button"
                  onClick={() => void setStatus(conversation.data!.id, conversation.data!.status === "open" ? "closed" : "open", agentId)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-[13px] font-medium hover:bg-zinc-50"
                >
                  {conversation.data.status === "open" ? <><CheckCircle2 className="h-4 w-4" /> Close</> : <><RotateCcw className="h-4 w-4" /> Reopen</>}
                </button>
              )}
            </header>
            <div ref={thread} className="flex-1 space-y-4 overflow-y-auto bg-[#fafafa] px-6 py-5">
              {messages.data?.map((m) => {
                const fromCustomer = m.kind === "customer";
                const author = fromCustomer ? customers.find((c) => c.id === m.authorId)! : agents.find((a) => a.id === m.authorId)!;
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${fromCustomer ? "" : "flex-row-reverse"}`}>
                    <Avatar name={author.name} color={author.color} size={28} />
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${fromCustomer ? "bg-white shadow-sm" : "bg-[#286efa] text-white"}`}>
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[11px] ${fromCustomer ? "text-zinc-400" : "text-blue-100"}`}>{author.name} · {new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="border-t border-zinc-200 p-4" onSubmit={(e) => { e.preventDefault(); void reply(); }}>
              {error && <p role="alert" className="mb-2 text-[13px] text-red-600">{error} Your draft is kept.</p>}
              <div className="rounded-xl border border-zinc-300 focus-within:border-[#286efa]">
                <textarea
                  aria-label="Reply"
                  placeholder="Reply to the customer…"
                  className="h-24 w-full resize-none rounded-xl p-3 outline-none"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [draftKey]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void reply(); }}
                />
                <div className="flex justify-end px-3 pb-2">
                  <button type="submit" disabled={sending || !draft.trim()} className="flex items-center gap-1.5 rounded-lg bg-[#286efa] px-3 py-1.5 font-medium text-white disabled:opacity-40">
                    <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </main>

      <aside aria-label="Customer" className="w-72 shrink-0 border-l border-zinc-200 bg-white p-5">
        {customer.data ? (
          <>
            <div className="mb-4 flex items-center gap-3"><Avatar name={customer.data.name} color={customer.data.color} size={40} /><div><p className="font-semibold">{customer.data.name}</p><p className="text-[12px] text-zinc-500">{customer.data.plan} plan</p></div></div>
            <dl className="space-y-2 text-[13px] text-zinc-600">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {customer.data.email}</div>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {customer.data.company}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {customer.data.location}</div>
            </dl>
            <h3 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Attributes</h3>
            <dl className="space-y-1.5 text-[13px]">
              {Object.entries(customer.data.attributes).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="font-mono text-[12px] text-zinc-500">{key}</dt>
                  <dd className={value ? "text-zinc-800" : "italic text-zinc-400"}>{value ?? "missing"}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-zinc-400">Customer details appear here.</p>
        )}
      </aside>

      <MockControls
        sections={[
          {
            title: "Customers and agents",
            actions: [
              { label: "New conversation arrives", run: simulateNewConversation },
              ...(selectedId
                ? [
                    { label: "Customer replies in this conversation", run: () => simulateCustomerMessage(selectedId) },
                    { label: "Marcus replies in this conversation", run: () => simulateAgentReply(selectedId, "marcus") },
                  ]
                : []),
            ],
          },
          {
            title: "Failures",
            actions: [
              { label: "Fail next reply", run: failNextReply },
              { label: "Lose next reply response (reply still sends)", run: () => network.loseNextResponse("sendReply") },
              { label: "Fail next add tag", run: () => network.failNext("addTag") },
              { label: "Fail next priority change", run: () => network.failNext("setPriority") },
              { label: "Fail next close/reopen", run: () => network.failNext("setStatus") },
            ],
          },
        ]}
        onReset={resetHelpdeskData}
      />
    </div>
  );
}
