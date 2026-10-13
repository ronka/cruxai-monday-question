/** @jest-environment node */
import { afterEach, beforeAll, beforeEach, expect, jest, test } from "@jest/globals";
import {
  failNextMessageSend,
  getMessages,
  getReplies,
  chatDb,
  sendMessage,
  subscribeToMessages,
} from "@/api/chatApi";

beforeAll(async () => {
  await chatDb();
});

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});
async function finish<T>(operation: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();
  return operation;
}

test("replies stay out of the channel timeline and retries emit only once", async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToMessages(listener);
  const input = {
    channelId: "product",
    parentId: "product-1",
    body: " A reply ",
    clientId: "test-reply",
  };
  const reply = await finish(sendMessage(input));
  expect(reply.body).toBe("A reply");
  expect(await finish(sendMessage(input))).toEqual(reply);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(await finish(getReplies("product-1"))).toContainEqual(reply);
  expect(await finish(getMessages("product"))).not.toContainEqual(reply);
  unsubscribe();
  await finish(
    sendMessage({
      channelId: "product",
      body: "After unsubscribe",
      clientId: "test-unsubscribe",
    }),
  );
  expect(listener).toHaveBeenCalledTimes(1);
});

test("a simulated failure can be retried with the same ID", async () => {
  const input = {
    channelId: "general",
    body: "Retry me",
    clientId: "test-retry",
  };
  failNextMessageSend();
  const failure = expect(sendMessage(input)).rejects.toThrow(
    "request failed",
  );
  await jest.runAllTimersAsync();
  await failure;
  const sent = await finish(sendMessage(input));
  expect(
    (await finish(getMessages("general"))).filter(
      (message) => message.id === sent.id,
    ),
  ).toHaveLength(1);
});

test("rejects cross-channel parents and blank messages", async () => {
  const invalidParent = expect(
    sendMessage({
      channelId: "general",
      parentId: "product-1",
      body: "Wrong channel",
      clientId: "bad-parent",
    }),
  ).rejects.toThrow("Parent message not found");
  await jest.runAllTimersAsync();
  await invalidParent;
  const blank = expect(
    sendMessage({ channelId: "general", body: "  ", clientId: "blank" }),
  ).rejects.toThrow("1–4,000");
  await jest.runAllTimersAsync();
  await blank;
});

test("messages are stamped with the mock clock", async () => {
  const { clock, DAY } = await import("@/mock/clock");
  clock.reset(Date.parse("2026-10-20T08:00:00Z"));
  clock.advance(DAY);
  const sent = await finish(
    sendMessage({ channelId: "random", body: "Later", clientId: "clocked" }),
  );
  expect(sent.createdAt).toBe("2026-10-21T08:00:00.000Z");
});
