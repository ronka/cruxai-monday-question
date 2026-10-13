# Pulse — dashboard variables and shared filter URLs interview

A Datadog-inspired frontend starter for a feature implementation interview. The app shows the **Platform overview** dashboard: a grid of chart widgets (Recharts), a global time-range selector, live refresh, and a metrics API with data tagged by **env**, **service**, and **region**. Tag values differ by **time window** and **environment** (a region that came online recently, a decommissioned service, staging-only and prod-only services), and a query helper returns the values present in a window. Data and saved state live in browser SQLite. **Dashboard variables are the candidate's task and are not implemented.**

Template: **Pulse** (shared with the dashboard-editing and period-comparison questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add configurable **dashboard variables** for `env`, `service`, and `region` that apply to **selected widgets** (choose which widgets each variable affects).
2. Support **multiple values**, **All**, and **saved defaults** (persisted).
3. Encode selections (and the time range) in a **shareable URL**; support browser **back/forward**.
4. **Narrow** service choices based on the selected environment.
5. Handle values that **disappear** after changing the time window (e.g. `ap-south-1` only exists in the last 6 hours; `legacy-cron` stopped 2 days ago) — and URLs that contain such values.
6. Cancel or ignore **stale responses** when filters change quickly; let **individual failed widgets retry** independently.

Add meaningful tests for URL encoding/decoding, narrowing, disappearing values, and stale-response handling.

## What the starter provides

- **Query helpers** — `queryMetric({ metric, from, to, filters: { env?, service?, region? }, groupBy? }, { signal })` and its synchronous twin `evaluate(query)`; `getTagValues(tag, { from, to }, filters)` / `tagValuesIn(...)` return values with data in a window, narrowed by other filters. Series for tag values with no data in the window are omitted.
- **Availability rules** — `exists(env, service, region, t)` in `src/api/pulseApi.ts` documents exactly when each combination reports.
- **Widgets** — `WidgetView` (query, loading, error, retry) and `WidgetChart`.
- **Mock controls** — clock, teammate saves, fail the next widget query or tag-values lookup, slow queries, reset local data.
- **Browser SQLite** — `pulseDb()` in `src/api/pulseApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data).

## Code map

- [Dashboard](src/components/pulse/PulseApp.tsx), [widgets](src/components/pulse/WidgetView.tsx), [mock API](src/api/pulseApi.ts), [fixtures](src/data/pulseData.ts), [types](src/types/pulse.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
