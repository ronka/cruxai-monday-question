import type { Dashboard, MetricInfo } from "@/types/pulse";

export const METRICS: MetricInfo[] = [
  { name: "requests", label: "Requests / s", unit: "req/s", defaultAggregation: "sum" },
  { name: "latency_p95", label: "p95 latency", unit: "ms", defaultAggregation: "max" },
  { name: "error_rate", label: "Error rate", unit: "%", defaultAggregation: "avg" },
  { name: "cpu", label: "CPU", unit: "%", defaultAggregation: "avg" },
  { name: "memory", label: "Memory", unit: "GiB", defaultAggregation: "sum" },
  { name: "queue_depth", label: "Queue depth", unit: "jobs", defaultAggregation: "sum" },
];

export const TAGS = {
  env: ["prod", "staging"],
  service: ["api", "web", "worker", "billing"],
  region: ["us-east-1", "eu-west-1"],
};

export const CURRENT_USER = "Ada Nwosu";

export const seedDashboard: Omit<Dashboard, "version" | "updatedAt" | "updatedBy"> = {
  id: "dash-platform",
  title: "Platform overview",
  description: "Golden signals for the production platform.",
  widgets: [
    { id: "w-req", title: "Requests / s", type: "query_value", query: { metric: "requests", aggregation: "sum" }, layout: { x: 0, y: 0, w: 3, h: 2 } },
    { id: "w-err", title: "Error rate", type: "query_value", query: { metric: "error_rate", aggregation: "avg" }, layout: { x: 3, y: 0, w: 3, h: 2 } },
    { id: "w-p95", title: "p95 latency", type: "query_value", query: { metric: "latency_p95", aggregation: "max" }, layout: { x: 6, y: 0, w: 3, h: 2 } },
    { id: "w-queue", title: "Queue depth", type: "query_value", query: { metric: "queue_depth", aggregation: "sum" }, layout: { x: 9, y: 0, w: 3, h: 2 } },
    { id: "w-req-svc", title: "Requests by service", type: "timeseries", query: { metric: "requests", aggregation: "sum", groupBy: "service" }, layout: { x: 0, y: 2, w: 8, h: 4 } },
    { id: "w-top-err", title: "Errors by service", type: "toplist", query: { metric: "error_rate", aggregation: "avg", groupBy: "service" }, layout: { x: 8, y: 2, w: 4, h: 4 } },
    { id: "w-lat", title: "p95 latency by region", type: "timeseries", query: { metric: "latency_p95", aggregation: "max", groupBy: "region" }, layout: { x: 0, y: 6, w: 6, h: 4 } },
    { id: "w-cpu", title: "CPU by service", type: "timeseries", query: { metric: "cpu", aggregation: "avg", groupBy: "service" }, layout: { x: 6, y: 6, w: 6, h: 4 } },
  ],
};

export const TIME_RANGES = [
  { id: "15m", label: "Past 15 minutes", ms: 15 * 60_000 },
  { id: "1h", label: "Past 1 hour", ms: 60 * 60_000 },
  { id: "4h", label: "Past 4 hours", ms: 4 * 60 * 60_000 },
  { id: "1d", label: "Past 1 day", ms: 24 * 60 * 60_000 },
  { id: "1w", label: "Past 1 week", ms: 7 * 24 * 60 * 60_000 },
] as const;
export type TimeRangeId = (typeof TIME_RANGES)[number]["id"];
