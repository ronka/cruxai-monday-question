/** @jest-environment node */
import { expect, test } from "@jest/globals";
import { openDatabase } from "@/mock/sqlite";
import { clock, HOUR } from "@/mock/clock";
import { network, simulate } from "@/mock/network";

test("sqlite adapter seeds once and rolls back failed transactions", async () => {
  const db = await openDatabase({
    name: "infra-test",
    version: 1,
    schema: "CREATE TABLE items (id TEXT PRIMARY KEY, qty INTEGER NOT NULL);",
    seed: (seedDb) => seedDb.run("INSERT INTO items VALUES (?, ?)", ["a", 1]),
  });
  expect(db.all("SELECT * FROM items")).toEqual([{ id: "a", qty: 1 }]);
  expect(() =>
    db.transaction(() => {
      db.run("UPDATE items SET qty = 5 WHERE id = 'a'");
      throw new Error("abort");
    }),
  ).toThrow("abort");
  expect(db.get("SELECT qty FROM items")).toEqual({ qty: 1 });
  await db.reset();
  expect(db.all("SELECT id FROM items")).toEqual([{ id: "a" }]);
});

test("mock clock advances deterministically", () => {
  clock.reset(0 + 1000);
  clock.advance(HOUR);
  expect(clock.now()).toBe(1000 + HOUR);
});

test("lost responses apply the change before rejecting", async () => {
  network.setLatency(0);
  let applied = 0;
  network.loseNextResponse("save");
  await expect(simulate("save", () => ++applied)).rejects.toThrow("timed out");
  expect(applied).toBe(1);
  await expect(simulate("save", () => ++applied)).resolves.toBe(2);
});
