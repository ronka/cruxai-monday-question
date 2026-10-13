"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ChevronDown,
  Hash,
  Headphones,
  Home,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { channels, members } from "@/data/chatData";
import {
  failNextMessageSend,
  getMessages,
  sendMessage,
  simulateIncomingMessage,
  subscribeToMessages,
} from "@/api/chatApi";
import type { Message } from "@/types/chat";
import { MessageList } from "./MessageList";
import "./chat.css";

export function ChatWorkspace() {
  const [channelId, setChannelId] = useState("product");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [simulation, setSimulation] = useState(false);
  const [failureArmed, setFailureArmed] = useState(false);
  const timeline = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const channel = channels.find((item) => item.id === channelId)!;
  const query = useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => getMessages(channelId),
  });
  const messages = query.data ?? [];
  const visibleMessages = messages.filter(
    (message) =>
      message.body.toLowerCase().includes(search.toLowerCase()) ||
      members
        .find((member) => member.id === message.authorId)
        ?.name.toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => {
    const restore = () => {
      const id = new URLSearchParams(window.location.search).get("channel");
      setChannelId(channels.some((item) => item.id === id) ? id! : "product");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(
    () =>
      subscribeToMessages((message) => {
        if (!message.parentId)
          void queryClient.invalidateQueries({
            queryKey: ["messages", message.channelId],
          });
      }),
    [queryClient],
  );
  useEffect(() => {
    if (!simulation) return;
    const timer = window.setInterval(
      () => simulateIncomingMessage(channelId),
      15000,
    );
    return () => window.clearInterval(timer);
  }, [simulation, channelId]);
  function selectChannel(id: string) {
    setChannelId(id);
    setSearch("");
    setError("");
    window.history.pushState(null, "", `?channel=${id}`);
  }
  async function submit() {
    const body = drafts[channelId] ?? "";
    if (!body.trim() || sending) return;
    const target = channelId;
    setSending(true);
    setError("");
    try {
      await sendMessage({
        channelId: target,
        body,
        clientId: crypto.randomUUID(),
      });
      setDrafts((previous) => ({ ...previous, [target]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["messages", target] });
      timeline.current?.scrollTo({
        top: timeline.current.scrollHeight,
        behavior: "smooth",
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send message",
      );
    } finally {
      setSending(false);
      setFailureArmed(false);
    }
  }
  return (
    <div className="chat-app">
      <header className="workspace-top">
        <span className="workspace-wordmark">
          <span className="brand-mark">✳</span> relay
        </span>
        <div className="global-search">
          <Search size={16} />
          <input
            aria-label="Search this channel"
            placeholder={`Search in #${channel.name}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>⌕</span>
        </div>
        <span className="top-label">A little more connected.</span>
        <div className="self-avatar">
          AM
          <span />
        </div>
      </header>
      <div className="workspace-body">
        <nav className="app-rail" aria-label="Workspace">
          <div className="workspace-icon">
            S<span />
          </div>
          <div className="rail-item selected">
            <Home size={21} />
            <span>Home</span>
          </div>
          <div className="rail-bottom">
            <Headphones size={21} />
          </div>
        </nav>
        <aside className="channel-sidebar">
          <div className="workspace-name">
            Studio North <ChevronDown size={17} />
          </div>
          <div className="workspace-plan">
            <span /> Your team’s shared space
          </div>
          <div className="sidebar-section-label">WORKSPACE</div>
          <div className="sidebar-overview">
            <MessageSquare size={16} /> Team conversations
          </div>
          <div className="channel-heading">
            Channels <span>{channels.length}</span>
          </div>
          <nav aria-label="Channels">
            {channels.map((item) => (
              <button
                key={item.id}
                className={`channel-link ${item.id === channelId ? "active" : ""}`}
                onClick={() => selectChannel(item.id)}
              >
                <Hash size={17} />
                {item.name}
                {item.id === "product" && <span className="channel-dot" />}
              </button>
            ))}
          </nav>
          <div className="channel-heading people-heading">
            Your people <span>{members.length}</span>
          </div>
          {members.map((member) => (
            <div className="person-row" key={member.id}>
              <span
                className="tiny-avatar"
                style={{ background: member.color }}
              >
                {member.initials}
                <i />
              </span>
              {member.name}
              {member.id === "alex" && <small>you</small>}
            </div>
          ))}
          <div className="sidebar-footer">
            <Sparkles size={17} />
            <div>
              Good work starts here.<small>Make room for a conversation.</small>
            </div>
          </div>
        </aside>
        <main className="channel-main">
          <header className="channel-header">
            <div>
              <h1>
                <Hash size={25} />
                {channel.name}
              </h1>
              <p>{channel.description}</p>
            </div>
            <span className="member-count">
              <Users size={16} />
              {channel.members} members
            </span>
          </header>
          <div className="channel-tabs">
            <span>
              <MessageSquare size={15} />
              Messages
            </span>
            <div>
              <span className="online-dot" /> All caught up
            </div>
          </div>
          <div className="channel-timeline" ref={timeline}>
            <div className="channel-welcome">
              <div className="welcome-hash">
                <Hash size={31} />
              </div>
              <h2>A space for {channel.name}.</h2>
              <p>{channel.description}</p>
              <span>This is the beginning of your team’s conversation.</span>
            </div>
            <div className="date-divider">
              <span>Tuesday, October 13</span>
            </div>
            {query.isPending ? (
              <p className="timeline-notice" role="status">
                Loading messages…
              </p>
            ) : query.isError ? (
              <div className="timeline-notice" role="alert">
                Could not load messages.{" "}
                <button onClick={() => void query.refetch()}>Try again</button>
              </div>
            ) : (
              <>
                <MessageList messages={visibleMessages} />
                {visibleMessages.length === 0 && (
                  <p className="timeline-notice">
                    No messages match “{search}”.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="composer-area">
            {error && (
              <p className="send-error" role="alert">
                {error} Your draft is still here.
              </p>
            )}
            <form
              className="message-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className="sr-only" htmlFor="message-draft">
                Message #{channel.name}
              </label>
              <textarea
                id="message-draft"
                placeholder={`Message #${channel.name}`}
                value={drafts[channelId] ?? ""}
                disabled={sending}
                maxLength={4000}
                onChange={(event) =>
                  setDrafts((previous) => ({
                    ...previous,
                    [channelId]: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void submit();
                  }
                }}
              />
              <div className="composer-bottom">
                <span>Keep the conversation going.</span>
                <button
                  className="send-button"
                  type="submit"
                  disabled={sending || !drafts[channelId]?.trim()}
                  aria-label="Send message"
                >
                  {sending ? "Sending…" : <Send size={17} />}
                </button>
              </div>
            </form>
            <div className="composer-hint">
              <span>
                <strong>Enter</strong> to send · <strong>Shift + Enter</strong>{" "}
                for a new line
              </span>
              <span>Only visible to this workspace</span>
            </div>
          </div>
          <details className="mock-controls">
            <summary>
              <Wifi size={13} /> Mock workspace controls
            </summary>
            <div>
              <button onClick={() => simulateIncomingMessage(channelId)}>
                <ArrowDown size={13} /> Receive a message
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={simulation}
                  onChange={(event) => setSimulation(event.target.checked)}
                />{" "}
                Receive every 15 seconds
              </label>
              <button
                disabled={failureArmed}
                onClick={() => {
                  failNextMessageSend();
                  setFailureArmed(true);
                }}
              >
                {failureArmed ? "Next send will fail" : "Fail next send"}
              </button>
              <span>In-memory data · refresh to reset</span>
            </div>
          </details>
        </main>
      </div>
    </div>
  );
}
