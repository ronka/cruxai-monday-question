import { customers, incomingSamples, seedThreads } from "@/data/helpdeskData";
import { clock, MINUTE } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Conversation, ConversationStatus, Customer, HelpdeskEvent, Message } from "@/types/helpdesk";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures. Every agent
// sees the same data; read state is tracked per agent.
const SCHEMA = `
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  kind TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX messages_conversation ON messages (conversation_id, created_at);
CREATE TABLE reads (
  agent_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, conversation_id)
);
`;

export function helpdeskDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "helpdesk",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const now = clock.now();
      seedThreads.forEach((thread, index) => {
        const id = `conv-${index + 1}`;
        const start = now - thread.minutesAgo * MINUTE - thread.messages.length * 3 * MINUTE;
        db.run("INSERT INTO conversations VALUES (?, ?, ?, ?, ?, 1)", [id, thread.customer, thread.subject, thread.status, new Date(start).toISOString()]);
        thread.messages.forEach(([kind, author, body], m) => {
          const at = new Date(now - thread.minutesAgo * MINUTE - (thread.messages.length - 1 - m) * 3 * MINUTE).toISOString();
          db.run("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", [`${id}-m${m + 1}`, id, kind, author, body, at]);
        });
        // Older threads have been read by everyone; the newest few are unread.
        if (index >= 3 || thread.messages.at(-1)![0] === "agent")
          for (const agent of ["olivia", "marcus", "sana"])
            db.run("INSERT INTO reads VALUES (?, ?, ?)", [agent, id, new Date(now).toISOString()]);
      });
    },
  });
}

const events = createEmitter<HelpdeskEvent>();
/** Live changes: new messages (from any agent or customer) and conversation updates. */
export const subscribeToHelpdesk = events.subscribe;

type ConversationRow = {
  id: string;
  customer_id: string;
  subject: string;
  status: ConversationStatus;
  created_at: string;
  version: number;
  last_message_at: string;
  preview: string;
  last_customer_at: string | null;
  read_at: string | null;
};

const CONVERSATION_SQL = `
SELECT c.*,
  (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id) AS last_message_at,
  (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1) AS preview,
  (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id = c.id AND m.kind = 'customer') AS last_customer_at,
  (SELECT read_at FROM reads r WHERE r.conversation_id = c.id AND r.agent_id = ?) AS read_at
FROM conversations c`;

const toConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  customerId: row.customer_id,
  subject: row.subject,
  status: row.status,
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at,
  preview: row.preview,
  unread: !!row.last_customer_at && (!row.read_at || row.last_customer_at > row.read_at),
  version: row.version,
});

export function readConversation(db: LocalDatabase, id: string, agentId: string): Conversation {
  const row = db.get<ConversationRow>(`${CONVERSATION_SQL} WHERE c.id = ?`, [agentId, id]);
  if (!row) throw new Error("Conversation not found");
  return toConversation(row);
}

/** Conversations in a status, newest activity first, with this agent's unread state. */
export async function listConversations(status: ConversationStatus, agentId: string): Promise<Conversation[]> {
  const db = await helpdeskDb();
  return simulate("listConversations", () =>
    db.all<ConversationRow>(`${CONVERSATION_SQL} WHERE c.status = ? ORDER BY last_message_at DESC`, [agentId, status]).map(toConversation),
  );
}

export async function countConversations(): Promise<Record<ConversationStatus, number>> {
  const db = await helpdeskDb();
  return simulate("countConversations", () => {
    const rows = db.all<{ status: ConversationStatus; n: number }>("SELECT status, COUNT(*) AS n FROM conversations GROUP BY status");
    return { open: rows.find((r) => r.status === "open")?.n ?? 0, closed: rows.find((r) => r.status === "closed")?.n ?? 0 };
  });
}

export async function getConversation(id: string, agentId: string): Promise<Conversation> {
  const db = await helpdeskDb();
  return simulate("getConversation", () => readConversation(db, id, agentId));
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await helpdeskDb();
  return simulate("getMessages", () =>
    db
      .all<{ id: string; conversation_id: string; kind: Message["kind"]; author_id: string; body: string; created_at: string }>(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid",
        [conversationId],
      )
      .map((row) => ({ id: row.id, conversationId: row.conversation_id, kind: row.kind, authorId: row.author_id, body: row.body, createdAt: row.created_at })),
  );
}

export async function getCustomer(id: string): Promise<Customer> {
  return simulate("getCustomer", () => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) throw new Error("Customer not found");
    return customer;
  });
}

function insertMessage(db: LocalDatabase, conversationId: string, kind: Message["kind"], authorId: string, body: string, id = newId("msg-")): Message {
  const createdAt = clock.date().toISOString();
  db.run("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", [id, conversationId, kind, authorId, body, createdAt]);
  db.run("UPDATE conversations SET version = version + 1 WHERE id = ?", [conversationId]);
  events.emit({ type: "message", conversationId, messageId: id });
  return { id, conversationId, kind, authorId, body, createdAt };
}

/** Sends an agent reply. A repeated `clientId` returns the stored message. */
export async function sendReply(input: { conversationId: string; agentId: string; body: string; clientId: string }): Promise<Message> {
  const db = await helpdeskDb();
  return simulate("sendReply", () => {
    const existing = db.get<{ id: string }>("SELECT id FROM messages WHERE id = ?", [input.clientId]);
    if (existing) return getMessagesSync(db, input.conversationId).find((m) => m.id === input.clientId)!;
    readConversation(db, input.conversationId, input.agentId);
    if (!input.body.trim()) throw new Error("Reply cannot be empty");
    return insertMessage(db, input.conversationId, "agent", input.agentId, input.body.trim(), input.clientId);
  });
}

function getMessagesSync(db: LocalDatabase, conversationId: string): Message[] {
  return db
    .all<{ id: string; conversation_id: string; kind: Message["kind"]; author_id: string; body: string; created_at: string }>("SELECT * FROM messages WHERE conversation_id = ?", [conversationId])
    .map((row) => ({ id: row.id, conversationId: row.conversation_id, kind: row.kind, authorId: row.author_id, body: row.body, createdAt: row.created_at }));
}

export async function setStatus(conversationId: string, status: ConversationStatus, agentId: string): Promise<Conversation> {
  const db = await helpdeskDb();
  return simulate("setStatus", () => {
    readConversation(db, conversationId, agentId);
    db.run("UPDATE conversations SET status = ?, version = version + 1 WHERE id = ?", [status, conversationId]);
    events.emit({ type: "conversation", conversationId });
    return readConversation(db, conversationId, agentId);
  });
}

/** Marks a conversation read for one agent (up to the mock "now"). */
export async function markRead(conversationId: string, agentId: string): Promise<void> {
  const db = await helpdeskDb();
  db.run("INSERT INTO reads VALUES (?, ?, ?) ON CONFLICT(agent_id, conversation_id) DO UPDATE SET read_at = excluded.read_at", [agentId, conversationId, clock.date().toISOString()]);
  events.emit({ type: "conversation", conversationId });
}

let sample = 0;
/** Mock control: a customer writes in an existing conversation (reopening it if closed). */
export async function simulateCustomerMessage(conversationId: string): Promise<Message> {
  const db = await helpdeskDb();
  const row = db.get<{ customer_id: string; status: string }>("SELECT customer_id, status FROM conversations WHERE id = ?", [conversationId]);
  if (!row) throw new Error("Conversation not found");
  clock.advance(MINUTE);
  if (row.status === "closed") db.run("UPDATE conversations SET status = 'open' WHERE id = ?", [conversationId]);
  return insertMessage(db, conversationId, "customer", row.customer_id, incomingSamples[sample++ % incomingSamples.length]);
}

/** Mock control: a new conversation arrives from a random customer. */
export async function simulateNewConversation(): Promise<string> {
  const db = await helpdeskDb();
  const customer = customers[Math.floor(Math.random() * customers.length)];
  const id = newId("conv-");
  clock.advance(MINUTE);
  db.run("INSERT INTO conversations VALUES (?, ?, ?, 'open', ?, 1)", [id, customer.id, "New question", clock.date().toISOString()]);
  insertMessage(db, id, "customer", customer.id, "Hi there — quick question about my account.");
  return id;
}

/** Mock control: another agent replies in a conversation. */
export async function simulateAgentReply(conversationId: string, agentId: string): Promise<Message> {
  const db = await helpdeskDb();
  clock.advance(MINUTE);
  return insertMessage(db, conversationId, "agent", agentId, "Looking into this now.");
}

export function failNextReply(): void {
  network.failNext("sendReply");
}

export async function resetHelpdeskData(): Promise<void> {
  await (await helpdeskDb()).reset();
  clock.reset();
}
