/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { countConversations, failNextReply, getMessages, helpdeskDb, listConversations, markRead, sendReply, simulateCustomerMessage } from "@/api/helpdeskApi";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await helpdeskDb();
});

test("unread state is per agent", async () => {
  const before = await listConversations("open", "olivia");
  const unread = before.find((c) => c.unread)!;
  await markRead(unread.id, "olivia");
  expect((await listConversations("open", "olivia")).find((c) => c.id === unread.id)?.unread).toBe(false);
  expect((await listConversations("open", "marcus")).find((c) => c.id === unread.id)?.unread).toBe(true);
  await simulateCustomerMessage(unread.id);
  expect((await listConversations("open", "olivia")).find((c) => c.id === unread.id)?.unread).toBe(true);
});

test("replies are idempotent by client ID and failures store nothing", async () => {
  const input = { conversationId: "conv-2", agentId: "olivia", body: "On it!", clientId: "client-1" };
  failNextReply();
  await expect(sendReply(input)).rejects.toThrow("request failed");
  await sendReply(input);
  await sendReply(input);
  expect((await getMessages("conv-2")).filter((m) => m.id === "client-1")).toHaveLength(1);
  expect(await countConversations()).toEqual({ open: 7, closed: 2 });
});

test("internal notes are stored but never become the preview or unread", async () => {
  const { addNote, getConversation } = await import("@/api/helpdeskApi");
  await markRead("conv-4", "olivia");
  const before = await getConversation("conv-4", "olivia");
  await addNote({ conversationId: "conv-4", agentId: "sana", body: "Internal only", clientId: "note-1" });
  const after = await getConversation("conv-4", "olivia");
  expect(after.preview).toBe(before.preview);
  expect(after.unread).toBe(false);
  expect(after.assigneeId).toBe("olivia");
  expect((await getMessages("conv-4")).at(-1)).toMatchObject({ kind: "note", body: "Internal only" });
});
