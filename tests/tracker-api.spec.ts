/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import {
  archiveIssue,
  createIssue,
  deleteIssue,
  getIssue,
  getIssueHistory,
  getProjectIssues,
  searchIssues,
  trackerDb,
  updateIssue,
} from "@/api/trackerApi";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await trackerDb();
});

test("updates record one history entry per changed field", async () => {
  const before = (await getIssueHistory("i-1")).length;
  await updateIssue("WEB-1", { status: "done", priority: 2 });
  const history = await getIssueHistory("i-1");
  expect(history.length - before).toBe(1);
  expect(history.at(-1)).toMatchObject({ field: "status", from: "in_progress", to: "done" });
});

test("archived issues leave project lists but stay searchable on request", async () => {
  await archiveIssue("API-1");
  expect((await getProjectIssues("api")).map((i) => i.identifier)).not.toContain("API-1");
  expect((await searchIssues("Rate-limit")).length).toBe(0);
  expect((await searchIssues("Rate-limit", { includeArchived: true })).length).toBe(1);
});

test("identifiers increment per project and deleted issues reject", async () => {
  const issue = await createIssue({ projectId: "mob", title: "New one" });
  expect(issue.identifier).toBe("MOB-7");
  await deleteIssue(issue.id);
  await expect(getIssue("MOB-7")).rejects.toThrow("Issue not found");
});

test("cycles are seeded and cycle changes are recorded", async () => {
  const { listCycles, getCycleIssues } = await import("@/api/trackerApi");
  const cycles = await listCycles();
  expect(cycles.map((cycle) => cycle.number)).toEqual([12, 13]);
  const current = await getCycleIssues("c-12");
  expect(current.length).toBeGreaterThan(5);
  await updateIssue("WEB-2", { cycleId: "c-13" });
  expect((await getIssueHistory("i-2")).at(-1)).toMatchObject({ field: "cycleId", from: "c-12", to: "c-13" });
});
