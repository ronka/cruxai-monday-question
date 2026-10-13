# Pulse — dashboard editing interview

A Datadog-inspired frontend starter for a feature implementation interview. The app shows the **Platform overview** dashboard: a fixed 12-column grid of chart widgets (time series, query values, a top list) rendered with Recharts, a **global time-range selector**, **live refresh**, and a metrics API that serves seeded, tagged time-series data. Dashboards are stored with a **version** in browser SQLite. **Edit mode is the candidate's task and is not implemented.**

Template: **Pulse** (shared with the dashboard-variables and period-comparison questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add an **edit mode** where users can **add**, **remove**, **resize**, **rearrange**, and **configure** widgets (title, type, metric, aggregation, group-by).
2. Changes stay a **draft** until saved, with **undo/redo** and **cancel**.
3. Each widget can **inherit** the global time range or **override** it with its own.
4. Widget failures are **independent** (one failing query does not block others) and can be retried.
5. Prevent **stale responses** from replacing newer chart data when the range or configuration changes quickly (queries have variable latency).
6. Before saving, detect that **another user saved a newer version** (**Ravi saves a newer dashboard version**) and let the user resolve it instead of overwriting.

Add meaningful tests for the draft/undo model, layout operations, and stale-response handling.

## What the starter provides

- **Metrics** — `queryMetric({ metric, from, to, aggregation?, filters?, groupBy? }, { signal })` returns `{ stepMs, series: [{ label, points: [{ t, v }] }] }`. Latency varies per call; `v: null` means missing data. `evaluate(query)` is the same computation synchronously.
- **Widgets** — `WidgetView` (query + loading/error/retry) and `WidgetChart` (renderer). Layout is `{ x, y, w, h }` on a 12-column grid.
- **Dashboards** — `getDashboard()`, `saveDashboard(id, patch, expectedVersion)` rejects with `DashboardConflictError` (carrying the latest version).
- **Mock controls** — clock, teammate saves, fail the next widget query, slow queries, reset local data. Live mode advances the mock clock one minute every 15 s.

## Code map

- [Dashboard](src/components/pulse/PulseApp.tsx): header, time range, live mode, grid, mock controls.
- [Widgets](src/components/pulse/WidgetView.tsx), [mock API](src/api/pulseApi.ts), [fixtures](src/data/pulseData.ts), [types](src/types/pulse.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
