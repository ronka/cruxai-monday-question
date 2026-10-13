# Canvas Review — batch asset export interview

A Figma-inspired frontend starter for a feature implementation interview. The app shows a design file with five artboards on a pannable, zoomable canvas with selection, an artboard list, and deep links. It supplies **SVG/PNG rendering helpers**, a simulated render service with **progress and cancellation**, a **download helper**, export **failure controls**, and a control that makes a teammate **edit the file** (new revision) while you export. Data persists in browser SQLite. **Export presets and the batch export queue are the candidate's task and are not implemented.** Do not build an image encoder.

Template: **Canvas Review** (shared with the contextual-comments and version-history questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add **per-artboard export presets**: format (PNG or SVG), a **supported scale** (`SUPPORTED_SCALES`; SVG ignores scale), and a **filename suffix** (e.g. `@2x`). An artboard can have several presets. Presets survive a refresh.
2. Build a **batch export queue**: select artboards, show **previews**, per-item **progress**, **cancel** (one item or all), and **retry failed items**.
3. Detect **duplicate output filenames** before starting (e.g. two presets that resolve to the same name) and let the user resolve them.
4. **Freeze** each job's source revision and settings when it is queued: a teammate edit (**Teammate edits “Home — Mobile”**) or a preset change during the export must not change that job's output.
5. Preserve successful results when another item fails, and let the user **download** results individually (or all successful ones).

Add meaningful tests for filename generation and conflicts, freezing, and queue state transitions.

## What the starter provides

- **Export utilities** — `src/lib/export.ts`: `artboardToSvg(artboard)`, `artboardToPng(artboard, scale)`, `exportArtboard(artboard, settings, { signal, onProgress })` (takes ~1–3 s, honours `AbortSignal`, renders exactly the artboard object you pass), `downloadBlob(blob, filename)`.
- **Failures** — **Mock controls → Export failures**: fail the next export, or keep failing *Dashboard — Desktop* until stopped.
- **Revisions** — `getDocument()` returns `revision`; `simulateTeammateEdit()` changes an artboard and bumps it; `subscribeToDocument` notifies.
- **Browser SQLite** — `canvasDb()` in `src/api/canvasApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data).
- **Canvas** — `CanvasView` (pan/zoom/select), `ArtboardSvg`, viewport math.

## Code map

- [App shell](src/components/canvas/CanvasApp.tsx): toolbar, artboard list, properties panel (export placeholder), mock controls.
- [Export utilities](src/lib/export.ts), [canvas](src/components/canvas/CanvasView.tsx), [renderer](src/components/canvas/ArtboardSvg.tsx).
- [Mock API](src/api/canvasApi.ts), [fixtures](src/data/canvasData.ts), [types](src/types/canvas.ts).

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
