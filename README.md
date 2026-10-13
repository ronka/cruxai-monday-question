# Pulse — compare with a previous period interview

A Datadog-inspired frontend starter for a feature implementation interview. The app shows the **Platform overview** dashboard: chart widgets (Recharts), a time-range selector, live refresh, a **display time-zone** selector, and a metrics API with **60 days of historical samples**. It includes **missing-data fixtures** (a collector outage exactly one week before 07:00–07:30 UTC today, plus a daily gap for worker in eu-west-1), a **real-zero fixture** (requests drained to 0 during yesterday's maintenance), **time-zone helpers**, and a control to jump past the New York **DST change** (Nov 1, 2026). **Period comparison is the candidate's task; no comparison series exists.**

Template: **Pulse** (shared with the dashboard-editing and dashboard-variables questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add a comparison option to time-series widgets: **previous equal-length period**, or **same local calendar period one week earlier** (in the selected display time zone).
2. **Overlay** the aligned comparison series and show **absolute** and **percentage** change (e.g. in the legend or a query-value widget).
3. Tooltips must reveal **both actual timestamps** (current and compared point).
4. Distinguish **missing data** from **zero**; **avoid division by zero** in percentage change (define what is shown).
5. Define and implement alignment across **daylight-saving transitions** (use **Jump to Nov 3** with *America/New_York*: one week earlier is 167 or 168 hours?).
6. Changing the range or comparison mode must **not mix old and new query results**.

Add meaningful tests for alignment (including DST), change calculations, and missing/zero handling.

## What the starter provides

- **Metrics** — `queryMetric(query, { signal })` (variable latency) and `evaluate(query)`; points are `{ t, v }` with `v: null` for missing data. `stepFor(rangeMs)` gives the bucket size.
- **Fixtures** — `OUTAGE` and `MAINTENANCE` in `src/api/pulseApi.ts`; `sample(metric, env, service, region, t)`.
- **Time zones** — `src/lib/time.ts`: `toWallTime`, `fromWallTime` (DST gaps and overlaps), `offsetMinutes`, date-key arithmetic; `timeZone` state in `PulseApp`.
- **Widgets** — `WidgetView` and `WidgetChart` (accept `timeZone`).
- **Mock controls** — clock, jump to Nov 3 / back to Oct 13, teammate saves, fail the next query, slow queries, reset local data.

## Code map

- [Dashboard](src/components/pulse/PulseApp.tsx), [widgets](src/components/pulse/WidgetView.tsx), [time helpers](src/lib/time.ts).
- [Mock API](src/api/pulseApi.ts), [fixtures](src/data/pulseData.ts), [types](src/types/pulse.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
