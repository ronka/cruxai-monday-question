export type MetricName = "requests" | "latency_p95" | "error_rate" | "cpu" | "memory" | "queue_depth";
export type Aggregation = "avg" | "sum" | "max";

export interface MetricInfo {
  name: MetricName;
  label: string;
  unit: string;
  /** How values combine across series when not grouped. */
  defaultAggregation: Aggregation;
}

export interface TagFilter {
  env?: string[];
  service?: string[];
  region?: string[];
}

export interface MetricQuery {
  metric: MetricName;
  /** Epoch ms, inclusive start / exclusive end. */
  from: number;
  to: number;
  aggregation?: Aggregation;
  filters?: TagFilter;
  groupBy?: "env" | "service" | "region";
}

export interface Series {
  /** Group label, e.g. "service:api", or "all". */
  label: string;
  /** Null marks missing data (no samples), which is different from 0. */
  points: { t: number; v: number | null }[];
}

export interface MetricResult {
  query: MetricQuery;
  stepMs: number;
  series: Series[];
}

export type WidgetType = "timeseries" | "query_value" | "toplist";

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  query: Omit<MetricQuery, "from" | "to">;
  /** Grid position in a 12-column layout (rows are 1 unit tall). */
  layout: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
  id: string;
  title: string;
  description: string;
  widgets: Widget[];
  version: number;
  updatedAt: string;
  updatedBy: string;
}
