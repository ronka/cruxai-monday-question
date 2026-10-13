"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, BarChart3, Clock, LayoutDashboard, Search, Server, Settings } from "lucide-react";
import { failNextQuery, getDashboard, resetPulseData, simulateTeammateSave, subscribeToDashboards } from "@/api/pulseApi";
import { TIME_RANGES, type TimeRangeId } from "@/data/pulseData";
import { clock, MINUTE } from "@/mock/clock";
import { MockControls, useMockClock } from "@/mock/MockControls";
import { network } from "@/mock/network";
import { TIME_ZONES } from "@/lib/time";
import { WidgetView } from "./WidgetView";

const ROW_PX = 72;

export function PulseApp() {
  const queryClient = useQueryClient();
  const now = useMockClock();
  const [range, setRange] = useState<TimeRangeId>("4h");
  const [live, setLive] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  /** Display time zone for axes and tooltips (user preference). */
  const [timeZone, setTimeZone] = useState("America/New_York");
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("range");
    if (TIME_RANGES.some((r) => r.id === id)) setRange(id as TimeRangeId);
  }, []);
  useEffect(() => subscribeToDashboards(() => void queryClient.invalidateQueries({ queryKey: ["dashboard"] })), [queryClient]);
  // Live mode: every 15 s the mock clock moves forward one minute and widgets refresh.
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      clock.advance(MINUTE);
      setRefreshKey((k) => k + 1);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [live]);

  const rangeMs = TIME_RANGES.find((r) => r.id === range)!.ms;
  const to = Math.floor(now / MINUTE) * MINUTE;
  const from = to - rangeMs;
  const rows = Math.max(0, ...(dashboard.data?.widgets.map((w) => w.layout.y + w.layout.h) ?? [0]));

  return (
    <div className="flex h-dvh bg-[#f8f8fa] text-[13px] text-zinc-800 [font-family:'Noto_Sans',ui-sans-serif,-apple-system,'Segoe_UI',sans-serif]">
      <nav aria-label="Main" className="flex w-14 shrink-0 flex-col items-center gap-4 bg-[#3c0f68] py-4 text-violet-200">
        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[15px] font-black text-[#632ca6]">P</span>
        <Search className="h-5 w-5" />
        <LayoutDashboard className="h-5 w-5 text-white" />
        <Activity className="h-5 w-5" />
        <Server className="h-5 w-5" />
        <Bell className="h-5 w-5" />
        <BarChart3 className="h-5 w-5" />
        <Settings className="mt-auto h-5 w-5" />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3">
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Dashboards</p>
            <h1 className="truncate text-[17px] font-semibold">{dashboard.data?.title ?? "Loading…"}</h1>
          </div>
          {dashboard.data && <span className="text-[11px] text-zinc-400">v{dashboard.data.version} · saved by {dashboard.data.updatedBy}</span>}
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2 py-1.5">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="sr-only">Time range</span>
              <select
                className="bg-transparent outline-none"
                value={range}
                onChange={(e) => {
                  setRange(e.target.value as TimeRangeId);
                  window.history.replaceState(null, "", `?range=${e.target.value}`);
                }}
              >
                {TIME_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            <select aria-label="Time zone" className="rounded-md border border-zinc-300 bg-white px-2 py-1.5" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {["UTC", ...TIME_ZONES].map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
            <button type="button" aria-pressed={live} onClick={() => setLive((v) => !v)} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${live ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-300"}`}>
              <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-zinc-400"}`} /> {live ? "Live" : "Paused"}
            </button>
            <span className="tabular-nums text-[12px] text-zinc-500">
              {new Date(from).toLocaleString("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – {new Date(to).toLocaleString("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          {dashboard.isError ? (
            <p role="alert">Could not load the dashboard. <button className="underline" onClick={() => void dashboard.refetch()}>Retry</button></p>
          ) : dashboard.data ? (
            <div className="relative grid grid-cols-12 gap-3" style={{ gridTemplateRows: `repeat(${rows}, ${ROW_PX}px)` }}>
              {dashboard.data.widgets.map((widget) => (
                <div key={widget.id} style={{ gridColumn: `${widget.layout.x + 1} / span ${widget.layout.w}`, gridRow: `${widget.layout.y + 1} / span ${widget.layout.h}` }}>
                  <WidgetView widget={widget} from={from} to={to} refreshKey={refreshKey} timeZone={timeZone} />
                </div>
              ))}
            </div>
          ) : (
            <p role="status" className="text-zinc-500">Loading dashboard…</p>
          )}
        </main>
      </div>
      <MockControls
        showClock
        timeZone={timeZone}
        sections={[
          {
            title: "Time",
            actions: [
              { label: "Jump to Nov 3, 09:00 New York (after DST ends)", run: () => clock.set(Date.parse("2026-11-03T14:00:00Z")) },
              { label: "Back to Oct 13, 09:00 UTC", run: () => clock.reset() },
            ],
          },
          { title: "Teammates", actions: [{ label: "Ravi saves a newer dashboard version", run: () => simulateTeammateSave() }] },
          {
            title: "Queries",
            actions: [
              { label: "Fail the next widget query", run: failNextQuery },
              { label: "Slow queries (1.5 s + jitter)", run: () => network.setLatency(1500) },
              { label: "Normal query speed", run: () => network.setLatency(350) },
            ],
          },
        ]}
        onReset={resetPulseData}
      />
    </div>
  );
}
