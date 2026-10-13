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
