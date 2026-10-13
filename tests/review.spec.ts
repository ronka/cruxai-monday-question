/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { getChangedFiles, getPullRequest, listComments, publishComment, reviewDb, simulatePush } from "@/api/reviewApi";
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

test("a push makes comments on changed lines outdated", async () => {
  const comment = await publishComment({ fileId: "f-config", line: 9, side: "new", body: "Validate this is a number?" });
  expect(comment.outdated).toBe(false);
  await simulatePush();
  expect((await getPullRequest()).commits).toHaveLength(2);
  const after = await listComments();
  expect(after.find((c) => c.id === "c-2")?.outdated).toBe(true); // health endpoint line changed
  expect(after.find((c) => c.id === comment.id)?.outdated).toBe(false); // config unchanged
});

test("suggestions, file store and idempotent commit adapter", async () => {
  const { createCommit, getFileContent, loseNextCommitResponse } = await import("@/api/reviewApi");
  const suggestions = (await listComments()).filter((c) => c.suggestion);
  expect(suggestions).toHaveLength(7);
  const pr = await getPullRequest();
  const content = await getFileContent("f-readme");
  const change = { fileId: "f-readme", content: content.replace("may make", "may make up to") };
  loseNextCommitResponse();
  await expect(createCommit({ parentSha: pr.headSha, message: "Apply", changes: [change], idempotencyKey: "k1" })).rejects.toThrow("timed out");
  const retry = await createCommit({ parentSha: pr.headSha, message: "Apply", changes: [change], idempotencyKey: "k1" });
  const after = await getPullRequest();
  expect(after.headSha).toBe(retry.sha);
  expect(after.commits).toHaveLength(pr.commits.length + 1);
  await expect(createCommit({ parentSha: pr.headSha, message: "Again", changes: [change], idempotencyKey: "k2" })).rejects.toThrow("branch moved");
  expect(await getFileContent("f-readme")).toContain("may make up to");
});
