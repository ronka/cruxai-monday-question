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

test("tasks are a separate database with estimates", async () => {
  const tasks = await getRecords("tasks");
  expect(tasks).toHaveLength(20);
  expect(tasks.some((task) => task.values["t-estimate"] == null)).toBe(true);
  const projects = await getRecords("projects");
  expect(projects.every((project) => project.databaseId === "projects")).toBe(true);
});
