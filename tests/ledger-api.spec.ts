/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import {
  deleteField,
  getDatabase,
  getRecords,
  ledgerDb,
  updateRecordValue,
} from "@/api/ledgerApi";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await ledgerDb();
});

test("updates validate the field type", async () => {
  await expect(updateRecordValue("p-1", "f-status", "Shipped")).rejects.toThrow("Unknown Status");
  const record = await updateRecordValue("p-1", "f-status", "Done");
  expect(record.values["f-status"]).toBe("Done");
});

test("deleting a field removes it and its values", async () => {
  await deleteField("f-team");
  const { fields } = await getDatabase("projects");
  expect(fields.map((field) => field.id)).not.toContain("f-team");
  const records = await getRecords("projects");
  expect(records.every((record) => !("f-team" in record.values))).toBe(true);
  await expect(deleteField("f-title")).rejects.toThrow("cannot be deleted");
});

test("changing a field type clears values that cannot convert", async () => {
  const { changeFieldType, updateChecklist, getRecord } = await import("@/api/ledgerApi");
  await updateRecordValue("p-2", "f-due", "2026-11-14");
  const field = await changeFieldType("f-due", "number");
  expect(field.type).toBe("number");
  expect((await getRecord("p-2")).values["f-due"]).toBeNull();
  await expect(
    updateChecklist("p-1", [
      { id: "x", text: "a", done: false },
      { id: "x", text: "b", done: false },
    ]),
  ).rejects.toThrow("unique");
});
