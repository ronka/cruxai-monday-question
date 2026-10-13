import { channels, currentUserId, initialMessages } from "@/data/chatData";
import { clock } from "@/mock/clock";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Message, SendMessageInput } from "@/types/chat";

// A browser-local mock server backed by SQLite. Messages persist across
// refreshes; use "Reset local data" in the mock controls to restore fixtures.
// Message timestamps come from the controllable mock clock.
const SCHEMA = `
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  parent_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX messages_channel ON messages (channel_id, created_at);
`;

export function chatDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "relay",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      for (const message of initialMessages)
        db.run("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", [
          message.id,
          message.channelId,
          message.parentId,
          message.authorId,
          message.body,
          new Date(message.createdAt).toISOString(),
        ]);
    },
  });
}

type MessageRow = {
  id: string;
  channel_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};
export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    channelId: row.channel_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

const listeners = new Set<(message: Message) => void>();
const deleteListeners = new Set<(id: string) => void>();
function assertChannel(id: string) {
  if (!channels.some((channel) => channel.id === id))
    throw new Error("Channel not found");
}
function findMessage(db: LocalDatabase, id: string) {
  const row = db.get<MessageRow>("SELECT * FROM messages WHERE id = ?", [id]);
  return row ? toMessage(row) : undefined;
}
function publish(db: LocalDatabase, message: Message) {
  db.run("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", [
    message.id,
    message.channelId,
    message.parentId,
    message.authorId,
    message.body,
    message.createdAt,
  ]);
  listeners.forEach((listener) => listener({ ...message }));
  return { ...message };
}
function assertParent(db: LocalDatabase, channelId: string, parentId?: string) {
  if (!parentId) return;
  const parent = findMessage(db, parentId);
  if (!parent || parent.channelId !== channelId || parent.parentId)
    throw new Error("Parent message not found in this channel");
}

export async function getMessages(channelId: string): Promise<Message[]> {
  const db = await chatDb();
  return simulate("getMessages", () => {
    assertChannel(channelId);
    return db
      .all<MessageRow>(
        "SELECT * FROM messages WHERE channel_id = ? AND parent_id IS NULL ORDER BY created_at, rowid",
        [channelId],
      )
      .map(toMessage);
  });
}
export async function getMessage(id: string): Promise<Message> {
  const db = await chatDb();
  return simulate("getMessage", () => {
    const message = findMessage(db, id);
    if (!message) throw new Error("Message not found");
    return message;
  });
}
export async function getReplies(parentId: string): Promise<Message[]> {
  const db = await chatDb();
  await getMessage(parentId);
  return db
    .all<MessageRow>(
      "SELECT * FROM messages WHERE parent_id = ? ORDER BY created_at, rowid",
      [parentId],
    )
    .map(toMessage);
}
/**
 * Sends a channel message or reply. A repeated `clientId` returns the stored
 * message instead of creating a duplicate.
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const db = await chatDb();
  return simulate("sendMessage", () => {
    assertChannel(input.channelId);
    const existing = findMessage(db, input.clientId);
    if (existing) return existing;
    const body = input.body.trim();
    if (!body || body.length > 4000)
      throw new Error("Messages must contain 1–4,000 characters.");
    assertParent(db, input.channelId, input.parentId);
    return publish(db, {
      id: input.clientId,
      channelId: input.channelId,
      parentId: input.parentId ?? null,
      authorId: currentUserId,
      body,
      createdAt: clock.date().toISOString(),
    });
  });
}
export function subscribeToMessages(
  listener: (message: Message) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function simulateIncomingMessage(
  channelId: string,
  parentId?: string,
): Promise<Message> {
  const db = await chatDb();
  assertChannel(channelId);
  assertParent(db, channelId, parentId);
  return publish(db, {
    id: crypto.randomUUID(),
    channelId,
    parentId: parentId ?? null,
    authorId: "maya",
    body: "Just finished reviewing this — looking good! I have a couple of thoughts to share.",
    createdAt: clock.date().toISOString(),
  });
}
/**
 * Mock control: another member deletes a message (and its replies). Afterwards
 * `getMessage(id)` rejects with "Message not found".
 */
export async function deleteMessage(id: string): Promise<void> {
  const db = await chatDb();
  if (!findMessage(db, id)) throw new Error("Message not found");
  db.run("DELETE FROM messages WHERE id = ? OR parent_id = ?", [id, id]);
  deleteListeners.forEach((listener) => listener(id));
}
/** Mock control helper: the newest top-level message in a channel. */
export async function latestMessageId(channelId: string): Promise<string | undefined> {
  const db = await chatDb();
  return db.get<{ id: string }>(
    "SELECT id FROM messages WHERE channel_id = ? AND parent_id IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1",
    [channelId],
  )?.id;
}
export function subscribeToDeletes(listener: (id: string) => void): () => void {
  deleteListeners.add(listener);
  return () => {
    deleteListeners.delete(listener);
  };
}
/** The next `sendMessage` call rejects without storing anything. */
export function failNextMessageSend(): void {
  network.failNext("sendMessage");
}
export async function resetChatData(): Promise<void> {
  await (await chatDb()).reset();
  clock.reset();
}
