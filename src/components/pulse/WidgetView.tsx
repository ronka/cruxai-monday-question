"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { queryMetric } from "@/api/pulseApi";
import { METRICS } from "@/data/pulseData";
import type { MetricResult, Widget } from "@/types/pulse";

export const PALETTE = ["#632ca6", "#3d8dd4", "#2fa58b", "#e6a23c", "#d4495e", "#7f8c8d"];

const formatTime = (t: number, rangeMs: number, timeZone?: string) =>
  new Date(t).toLocaleString("en-US", { timeZone, ...(rangeMs > 86_400_000 ? { month: "short", day: "numeric" } : { hour: "numeric", minute: "2-digit" }) });

function latest(result: MetricResult): number | null {
  const points = result.series[0]?.points ?? [];
  for (let i = points.length - 1; i >= 0; i--) if (points[i].v !== null) return points[i].v;
  return null;
}

/** Supplied chart renderer for one result (Recharts). Null values render as gaps. */
export function WidgetChart({ widget, result, rangeMs, timeZone }: { widget: Widget; result: MetricResult; rangeMs: number; timeZone?: string }) {
  const unit = METRICS.find((m) => m.name === widget.query.metric)?.unit ?? "";
  if (widget.type === "query_value") {
    const value = latest(result);
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <span className="text-[40px] font-light tabular-nums text-zinc-800">{value === null ? "—" : value.toLocaleString()}</span>
        <span className="text-[12px] text-zinc-500">{unit}</span>
      </div>
    );
  }
  if (widget.type === "toplist") {
    const rows = result.series
      .map((s) => ({ label: s.label.split(":")[1] ?? s.label, value: s.points.filter((p) => p.v !== null).reduce((sum, p, _, all) => sum + p.v! / all.length, 0) }))
      .sort((a, b) => b.value - a.value);
    const max = Math.max(...rows.map((r) => r.value), 1);
    return (
      <ul className="space-y-2 px-1 pt-2 text-[12px]">
        {rows.map((row, i) => (
          <li key={row.label}>
            <div className="mb-0.5 flex justify-between"><span>{row.label}</span><span className="tabular-nums">{row.value.toFixed(2)} {unit}</span></div>
            <div className="h-2 rounded bg-zinc-100"><div className="h-2 rounded" style={{ width: `${(row.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></div>
          </li>
        ))}
      </ul>
    );
  }
  const data = result.series[0]?.points.map((p, i) => Object.fromEntries([["t", p.t], ...result.series.map((s) => [s.label, s.points[i]?.v ?? null])])) ?? [];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => formatTime(t, rangeMs, timeZone)} tick={{ fontSize: 10, fill: "#71717a" }} minTickGap={40} />
        <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={48} />
        <Tooltip labelFormatter={(t) => new Date(t as number).toLocaleString("en-US", { timeZone, timeZoneName: "short" })} formatter={(v) => (v === null ? "no data" : `${v} ${unit}`)} contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
        {result.series.map((s, i) => (
          <Area key={s.label} type="monotone" dataKey={s.label} name={s.label.split(":")[1] ?? s.label} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.08} strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** A dashboard widget: runs its query for the global range and renders it. */
export function WidgetView({ widget, from, to, refreshKey, timeZone }: { widget: Widget; from: number; to: number; refreshKey: number; timeZone?: string }) {
  const query = useQuery({
    queryKey: ["metric", widget.id, widget.query, from, to, refreshKey],
    queryFn: ({ signal }) => queryMetric({ ...widget.query, from, to }, { signal }),
    placeholderData: (previous) => previous,
    retry: false,
  });
  return (
    <section className="flex h-full flex-col rounded-md border border-zinc-200 bg-white" aria-label={widget.title}>
      <header className="flex items-center justify-between px-3 pb-1 pt-2">
        <h3 className="truncate text-[13px] font-medium text-zinc-700">{widget.title}</h3>
        {query.isFetching && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#632ca6]" title="Updating" />}
      </header>
      <div className="min-h-0 flex-1 px-2 pb-2">
        {query.isError ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-zinc-500">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Query failed
            <button type="button" onClick={() => void query.refetch()} className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-0.5"><RotateCw className="h-3 w-3" /> Retry</button>
          </div>
        ) : !query.data ? (
          <div role="status" className="h-full animate-pulse rounded bg-zinc-50" />
        ) : (
          <WidgetChart widget={widget} result={query.data} rangeMs={to - from} timeZone={timeZone} />
        )}
      </div>
    </section>
  );
}
