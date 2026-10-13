import { CURRENT_USER, METRICS, seedDashboard, TAGS } from "@/data/pulseData";
import { clock, DAY, MINUTE } from "@/mock/clock";
import { createEmitter } from "@/mock/events";
import { delay, network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { Aggregation, Dashboard, MetricName, MetricQuery, MetricResult, Series, TagFilter, Widget } from "@/types/pulse";

// Browser-local mock server. Metrics are generated deterministically from
// (metric, tags, time), so any window can be queried. Dashboards persist in
// SQLite; "Reset local data" in the mock controls restores the fixture.

/** Metric samples exist from 30 days before the mock clock's start. */
export const RETENTION_MS = 30 * DAY;

function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

const SERVICE_SCALE: Record<string, number> = { api: 1, web: 0.8, worker: 0.35, billing: 0.15, search: 0.5, "legacy-cron": 0.05 };
const ENV_SCALE: Record<string, number> = { prod: 1, staging: 0.08 };
const REGION_SCALE: Record<string, number> = { "us-east-1": 0.6, "eu-west-1": 0.4, "ap-south-1": 0.25 };

/** Whether a tag combination reports data at time `t` (see TAGS notes in pulseData). */
export function exists(env: string, service: string, region: string, t: number): boolean {
  if (service === "billing" && env !== "prod") return false;
  if (service === "search" && env !== "staging") return false;
  if (service === "legacy-cron" && (env !== "prod" || t >= DEFAULT_NOW() - 2 * DAY)) return false;
  if (region === "ap-south-1" && t < DEFAULT_NOW() - 6 * 60 * MINUTE) return false;
  return true;
}

/**
 * One raw sample for a single tag combination at minute `t`, or null when the
 * source reported nothing (a gap). Gaps: worker in eu-west-1 reports nothing
 * between 03:00 and 03:40 UTC every day.
 */
export function sample(metric: MetricName, env: string, service: string, region: string, t: number): number | null {
  const minute = Math.floor(t / MINUTE) * MINUTE;
  if (!exists(env, service, region, minute)) return null;
  const hourOfDay = new Date(minute).getUTCHours() + new Date(minute).getUTCMinutes() / 60;
  if (service === "worker" && region === "eu-west-1" && hourOfDay >= 3 && hourOfDay < 3 + 40 / 60) return null;
  const daily = 1 + 0.35 * Math.sin(((hourOfDay - 9) / 24) * 2 * Math.PI);
  const jitter = 0.9 + noise(`${metric}${env}${service}${region}${minute}`) * 0.2;
  const scale = SERVICE_SCALE[service] * ENV_SCALE[env] * REGION_SCALE[region];
  // An error spike in billing during the last 90 minutes before the mock clock's start.
  const incident = service === "billing" && env === "prod" && minute > DEFAULT_NOW() - 90 * MINUTE && minute < DEFAULT_NOW() - 30 * MINUTE;
  switch (metric) {
    case "requests":
      return Math.round(1800 * scale * daily * jitter * 10) / 10;
    case "latency_p95":
      return Math.round((120 + 60 * (daily - 1) + (service === "billing" ? 90 : 0) + (incident ? 400 : 0)) * jitter);
    case "error_rate":
      return Math.round((0.4 + (service === "billing" ? 0.6 : 0) + (incident ? 7.5 : 0)) * jitter * 100) / 100;
    case "cpu":
      return Math.round(Math.min(100, (35 + 25 * daily * (service === "api" ? 1.2 : 0.8)) * jitter) * 10) / 10;
    case "memory":
      return Math.round(4 * SERVICE_SCALE[service] * (env === "prod" ? 1 : 0.3) * jitter * 100) / 100;
    case "queue_depth":
      return service === "worker" ? Math.round(40 * daily * jitter * ENV_SCALE[env] * REGION_SCALE[region] * 10) : 0;
  }
}
const DEFAULT_NOW = () => Date.parse("2026-10-13T09:00:00Z");

function aggregate(values: number[], aggregation: Aggregation): number | null {
  if (values.length === 0) return null;
  if (aggregation === "sum") return Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100;
  if (aggregation === "max") return Math.max(...values);
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100;
}

/** Step that yields roughly 60 points, rounded to whole minutes. */
export function stepFor(rangeMs: number): number {
  return Math.max(MINUTE, Math.round(rangeMs / 60 / MINUTE) * MINUTE);
}

/** Pure evaluation of a metric query (used by queryMetric and handy in tests). */
export function evaluate(query: MetricQuery): MetricResult {
  const info = METRICS.find((m) => m.name === query.metric);
  if (!info) throw new Error(`Unknown metric ${query.metric}`);
  const aggregation = query.aggregation ?? info.defaultAggregation;
  const stepMs = stepFor(query.to - query.from);
  const pick = (key: keyof typeof TAGS) => (query.filters?.[key]?.length ? query.filters[key]! : TAGS[key]);
  const combos = pick("env").flatMap((env) => pick("service").flatMap((service) => pick("region").map((region) => ({ env, service, region }))));
  const groups = new Map<string, typeof combos>();
  for (const combo of combos) {
    const label = query.groupBy ? `${query.groupBy}:${combo[query.groupBy]}` : "all";
    groups.set(label, [...(groups.get(label) ?? []), combo]);
  }
  const start = Math.floor(query.from / stepMs) * stepMs;
  const series: Series[] = [...groups].map(([label, members]) => {
    const points: Series["points"] = [];
    for (let t = start; t < query.to; t += stepMs) {
      if (t < DEFAULT_NOW() - RETENTION_MS || t > clock.now()) {
        points.push({ t, v: null });
        continue;
      }
      // Combine tags with the aggregation, then average over the step's minutes.
      const perMinute: number[] = [];
      for (let m = 0; m < Math.min(5, stepMs / MINUTE); m++) {
        const minute = t + Math.floor((m * stepMs) / Math.min(5, stepMs / MINUTE));
        const values = members.map((c) => sample(query.metric, c.env, c.service, c.region, minute)).filter((v): v is number => v !== null);
        const v = aggregate(values, aggregation);
        if (v !== null) perMinute.push(v);
      }
      points.push({ t, v: aggregate(perMinute, "avg") });
    }
    return { label, points };
  });
  // Groups whose tag value never reported in this window are omitted.
  return { query, stepMs, series: series.filter((s) => s.points.some((p) => p.v !== null)) };
}

/**
 * Tag values that have data in [from, to), optionally narrowed by other tag
 * filters (e.g. services that exist in env "staging"). Sorted by name.
 */
export function tagValuesIn(tag: keyof typeof TAGS, window: { from: number; to: number }, filters: TagFilter = {}): string[] {
  const step = Math.max(MINUTE, Math.round((window.to - window.from) / 240 / MINUTE) * MINUTE);
  const pick = (key: keyof typeof TAGS) => (key !== tag && filters[key]?.length ? filters[key]! : TAGS[key]);
  const found = new Set<string>();
  for (const env of pick("env"))
    for (const service of pick("service"))
      for (const region of pick("region")) {
        const value = { env, service, region }[tag];
        if (found.has(value)) continue;
        for (let t = window.from; t < Math.min(window.to, clock.now() + 1); t += step)
          if (t >= DEFAULT_NOW() - RETENTION_MS && exists(env, service, region, t)) {
            found.add(value);
            break;
          }
      }
  return [...found].sort();
}

/** Async version of `tagValuesIn`, with the same latency and fault injection as metric queries. */
export async function getTagValues(tag: keyof typeof TAGS, window: { from: number; to: number }, filters: TagFilter = {}): Promise<string[]> {
  await delay(Math.round(Math.random() * 400));
  return simulate("getTagValues", () => tagValuesIn(tag, window, filters));
}

/**
 * Runs a metric query like a remote API: latency varies per call (so responses
 * can arrive out of order), and it can fail through the mock controls.
 */
export async function queryMetric(query: MetricQuery, options: { signal?: AbortSignal } = {}): Promise<MetricResult> {
  await delay(Math.round(noise(`${JSON.stringify(query)}${Math.random()}`) * 700));
  if (options.signal?.aborted) throw new DOMException("Query canceled", "AbortError");
  return simulate("queryMetric", () => evaluate(query));
}

const SCHEMA = `CREATE TABLE dashboards (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);`;

export function pulseDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "pulse",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const { id, ...data } = seedDashboard;
      db.run("INSERT INTO dashboards VALUES (?, ?, 1, ?, ?)", [id, JSON.stringify(data), new Date(clock.now() - 3 * DAY).toISOString(), "Ravi Menon"]);
    },
  });
}

const events = createEmitter<{ type: "dashboard"; dashboardId: string; version: number }>();
export const subscribeToDashboards = events.subscribe;

export class DashboardConflictError extends Error {
  constructor(readonly current: Dashboard) {
    super(`${current.updatedBy} saved a newer version of this dashboard.`);
    this.name = "DashboardConflictError";
  }
}

type Row = { id: string; data: string; version: number; updated_at: string; updated_by: string };
function readDashboard(db: LocalDatabase, id: string): Dashboard {
  const row = db.get<Row>("SELECT * FROM dashboards WHERE id = ?", [id]);
  if (!row) throw new Error("Dashboard not found");
  return { id: row.id, ...JSON.parse(row.data), version: row.version, updatedAt: row.updated_at, updatedBy: row.updated_by };
}

export async function getDashboard(id = seedDashboard.id): Promise<Dashboard> {
  const db = await pulseDb();
  return simulate("getDashboard", () => readDashboard(db, id));
}

function write(db: LocalDatabase, id: string, patch: { title?: string; description?: string; widgets?: Widget[] }, author: string, expectedVersion?: number): Dashboard {
  const current = readDashboard(db, id);
  if (expectedVersion !== undefined && expectedVersion !== current.version) throw new DashboardConflictError(current);
  const data = { title: patch.title ?? current.title, description: patch.description ?? current.description, widgets: patch.widgets ?? current.widgets };
  db.run("UPDATE dashboards SET data = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ?", [JSON.stringify(data), clock.date().toISOString(), author, id]);
  const saved = readDashboard(db, id);
  events.emit({ type: "dashboard", dashboardId: id, version: saved.version });
  return saved;
}

/** Saves a dashboard. Pass the version you edited to detect newer saves. */
export async function saveDashboard(id: string, patch: { title?: string; description?: string; widgets?: Widget[] }, expectedVersion?: number): Promise<Dashboard> {
  const db = await pulseDb();
  return simulate("saveDashboard", () => write(db, id, patch, CURRENT_USER, expectedVersion));
}

/** Mock control: a teammate saves the dashboard (renames the first widget). */
export async function simulateTeammateSave(id = seedDashboard.id): Promise<Dashboard> {
  const db = await pulseDb();
  const current = readDashboard(db, id);
  const widgets = current.widgets.map((w, i) => (i === 0 ? { ...w, title: w.title.endsWith("(total)") ? w.title : `${w.title} (total)` } : w));
  return write(db, id, { widgets }, "Ravi Menon");
}

export function failNextQuery(): void {
  network.failNext("queryMetric");
}

export async function resetPulseData(): Promise<void> {
  await (await pulseDb()).reset();
  clock.reset();
}

