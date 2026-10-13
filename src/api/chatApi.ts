import { channels, currentUserId, initialMessages } from "@/data/chatData";
import type { Message, SendMessageInput } from "@/types/chat";

// A browser-local mock server, matching the Monday exercise's in-memory API.
// Refreshing restores fixtures. No HTTP, database, or credentials are needed.
let messages = initialMessages.map((message) => ({ ...message }));
const listeners = new Set<(message: Message) => void>();
let failNextSend = false;
const delay = () => new Promise((resolve) => setTimeout(resolve, 350));
function assertChannel(id: string) {
  if (!channels.some((channel) => channel.id === id))
    throw new Error("Channel not found");
}
function publish(message: Message) {
  messages.push(message);
  listeners.forEach((listener) => listener({ ...message }));
  return { ...message };
}
export async function getMessages(channelId: string): Promise<Message[]> {
  await delay();
  assertChannel(channelId);
  return messages
    .filter((message) => message.channelId === channelId && !message.parentId)
    .map((message) => ({ ...message }));
}
// Provided for the candidate; the starting UI does not consume thread endpoints.
export async function getMessage(id: string): Promise<Message> {
  await delay();
  const message = messages.find((item) => item.id === id);
  if (!message) throw new Error("Message not found");
  return { ...message };
}
export async function getReplies(parentId: string): Promise<Message[]> {
  await getMessage(parentId);
  return messages
    .filter((message) => message.parentId === parentId)
    .map((message) => ({ ...message }));
}
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  await delay();
  assertChannel(input.channelId);
  const existing = messages.find((message) => message.id === input.clientId);
  if (existing) return { ...existing };
  if (failNextSend) {
    failNextSend = false;
    throw new Error("Message could not be sent. Please try again.");
  }
  const body = input.body.trim();
  if (!body || body.length > 4000)
    throw new Error("Messages must contain 1–4,000 characters.");
  if (
    input.parentId &&
    !messages.some(
      (message) =>
        message.id === input.parentId &&
        message.channelId === input.channelId &&
        !message.parentId,
    )
  )
    throw new Error("Parent message not found in this channel");
  return publish({
    id: input.clientId,
    channelId: input.channelId,
    parentId: input.parentId ?? null,
    authorId: currentUserId,
    body,
    createdAt: new Date().toISOString(),
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
export function simulateIncomingMessage(
  channelId: string,
  parentId?: string,
): Message {
  assertChannel(channelId);
  if (
    parentId &&
    !messages.some(
      (message) =>
        message.id === parentId &&
        message.channelId === channelId &&
        !message.parentId,
    )
  )
    throw new Error("Parent message not found in this channel");
  return publish({
    id: crypto.randomUUID(),
    channelId,
    parentId: parentId ?? null,
    authorId: "maya",
    body: "Just finished reviewing this — looking good! I have a couple of thoughts to share.",
    createdAt: new Date().toISOString(),
  });
}
export function failNextMessageSend(): void {
  failNextSend = true;
}
