export interface Agent {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: "Free" | "Pro" | "Enterprise";
  location: string;
  color: string;
}

export type ConversationStatus = "open" | "closed";

export interface Conversation {
  id: string;
  customerId: string;
  subject: string;
  status: ConversationStatus;
  createdAt: string;
  /** Time of the latest message of any kind. */
  lastMessageAt: string;
  /** Preview of the latest message. */
  preview: string;
  /** True when the latest customer message is newer than this agent's last read. */
  unread: boolean;
  /** Agent the conversation is assigned to (assignment UI is out of scope here). */
  assigneeId: string | null;
  /** Increments on every change. */
  version: number;
}

export interface Message {
  id: string;
  conversationId: string;
  /** "note" is an internal note visible only to agents. */
  kind: "customer" | "agent" | "note";
  /** Customer ID or agent ID. */
  authorId: string;
  body: string;
  createdAt: string;
}

export type HelpdeskEvent =
  | { type: "message"; conversationId: string; messageId: string }
  | { type: "conversation"; conversationId: string };
