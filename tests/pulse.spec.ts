/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { DashboardConflictError, evaluate, getDashboard, pulseDb, sample, saveDashboard, simulateTeammateSave, stepFor } from "@/api/pulseApi";
import { clock, HOUR, MINUTE } from "@/mock/clock";
import { network } from "@/mock/network";

const NOW = Date.parse("2026-10-13T09:00:00Z");
beforeAll(async () => {
  clock.reset(NOW);
  network.setLatency(0);
  await pulseDb();
});

test("deterministic samples with a daily gap for worker in eu-west-1", () => {
  const t = Date.parse("2026-10-13T03:10:00Z");
  expect(sample("requests", "prod", "api", "us-east-1", t)).toBe(sample("requests", "prod", "api", "us-east-1", t));
  expect(sample("cpu", "prod", "worker", "eu-west-1", t)).toBeNull();
  expect(sample("cpu", "prod", "worker", "us-east-1", t)).not.toBeNull();
});

test("queries group series, use ~60 steps, and return null (not 0) for gaps", () => {
  const result = evaluate({ metric: "cpu", from: Date.parse("2026-10-13T02:00:00Z"), to: Date.parse("2026-10-13T05:00:00Z"), filters: { service: ["worker"], region: ["eu-west-1"] } });
  expect(result.stepMs).toBe(stepFor(3 * HOUR));
  expect(result.series).toHaveLength(1);
  expect(result.series[0].points.some((p) => p.v === null)).toBe(true);
  const grouped = evaluate({ metric: "requests", from: NOW - HOUR, to: NOW, groupBy: "service" });
  expect(grouped.series.map((s) => s.label)).toEqual(["service:api", "service:web", "service:worker", "service:billing", "service:search"]);
  expect(stepFor(15 * MINUTE)).toBe(MINUTE);
});

test("saves detect a newer version", async () => {
  const dashboard = await getDashboard();
  await simulateTeammateSave();
  await expect(saveDashboard(dashboard.id, { title: "Mine" }, dashboard.version)).rejects.toBeInstanceOf(DashboardConflictError);
});

test("tag values depend on the time window and other filters", async () => {
  const { tagValuesIn } = await import("@/api/pulseApi");
  const lastHour = { from: NOW - HOUR, to: NOW };
  const lastWeek = { from: NOW - 7 * 24 * HOUR, to: NOW - 3 * 24 * HOUR };
  expect(tagValuesIn("region", lastHour)).toEqual(["ap-south-1", "eu-west-1", "us-east-1"]);
  expect(tagValuesIn("region", lastWeek)).toEqual(["eu-west-1", "us-east-1"]);
  expect(tagValuesIn("service", lastHour)).not.toContain("legacy-cron");
  expect(tagValuesIn("service", lastWeek)).toContain("legacy-cron");
  expect(tagValuesIn("service", lastHour, { env: ["staging"] })).toEqual(["api", "search", "web", "worker"]);
});
