/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { getChangedFiles, getPullRequest, reviewDb, simulatePush } from "@/api/reviewApi";
import { diffLines, segmentRows } from "@/lib/diff";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await reviewDb();
});

test("diff rows and collapsible context", () => {
  const rows = diffLines("a\nb\nc\nd\ne\nf\ng\nh\ni", "a\nb\nc\nd\nE\nf\ng\nh\ni");
  expect(rows.filter((r) => r.kind !== "context")).toEqual([
    { kind: "del", oldLine: 5, text: "e" },
    { kind: "add", newLine: 5, text: "E" },
  ]);
  const segments = segmentRows(rows, 1);
  expect(segments.map((s) => [s.visible, s.rows.length])).toEqual([[false, 3], [true, 4], [false, 3]]);
});

test("changed files include added, modified and removed", async () => {
  const files = await getChangedFiles();
  expect(Object.fromEntries(files.map((f) => [f.path, f.status]))).toEqual({
    "README.md": "modified",
    "src/config.ts": "modified",
    "src/legacy/throttle.ts": "removed",
    "src/rateLimiter.ts": "added",
    "src/server.ts": "modified",
  });
});

test("the pushed commit edits, renames, adds and removes files with stable IDs", async () => {
  const before = await getChangedFiles();
  await simulatePush();
  const after = await getChangedFiles();
  const byId = Object.fromEntries(after.map((f) => [f.fileId, f]));
  expect(byId["f-config"]).toMatchObject({ status: "renamed", path: "src/settings.ts", previousPath: "src/config.ts" });
  expect(byId["f-config"].contentRevision).toBe(before.find((f) => f.fileId === "f-config")!.contentRevision);
  expect(byId["f-test"].status).toBe("added");
  expect(byId["f-issues"].status).toBe("removed");
  expect(byId["f-readme"]).toBeUndefined();
  expect(byId["f-limiter"].contentRevision).toBe(before.find((f) => f.fileId === "f-limiter")!.contentRevision);
  expect(byId["f-server"].contentRevision).not.toBe(before.find((f) => f.fileId === "f-server")!.contentRevision);
  await simulatePush();
  expect((await getPullRequest()).commits).toHaveLength(3);
  await expect(simulatePush()).rejects.toThrow("No more commits");
});
