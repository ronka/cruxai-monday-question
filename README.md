# Canvas Review — contextual comments interview

A Figma-inspired frontend starter for a feature implementation interview. The app already shows a design file with five static artboards on a pannable, zoomable canvas. Users can select artboards on the canvas or in the sidebar, step between them, zoom to fit (Shift+1) or to the selection (Shift+2), and deep-link to an artboard with `?artboard=<id>`. Data persists in browser SQLite. **Pinned comment threads are the candidate's task and are not implemented.**

Template: **Canvas Review** (shared with the version-history and batch-export questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002 (or `?artboard=ab-dashboard`).

## Task

1. Add a comment mode where users place a **pin** on an artboard and start a thread. Users can reply and **resolve/reopen** threads. A sidebar lists threads with a **show resolved** filter.
2. Pins stay attached to the **same spot on the artboard** while zooming, panning, and resizing the window (store positions relative to the artboard, not the screen).
3. Selecting a thread in the sidebar **reveals** its pin (pan/zoom as needed) and opens it. Opening a **direct link** to a comment navigates to it after a fresh load; handle missing comments.
4. Comment placement coexists with existing canvas interactions: panning, selecting artboards, Space-drag, and keyboard shortcuts must keep working.
5. Support **keyboard navigation** between threads and accessible pins (focus, labels, Escape to close).
6. Comments survive a refresh.

Choose and document the data model and URL format. Add meaningful tests for coordinate conversion and thread state.

## What the starter provides

- **Canvas** — `CanvasView` handles pan (drag empty space, Space+drag, scroll), zoom (Ctrl/⌘+scroll or pinch), and selection. It accepts `children` rendered in **canvas coordinates** and an `overlay` rendered in **screen coordinates**.
- **Viewport math** — `src/components/canvas/viewport.ts`: `screenToCanvas`, `canvasToScreen`, `zoomAt`, `fitBounds`, `boundsOf`.
- **Collaborators** — `COLLABORATORS` / `CURRENT_USER` in `src/data/canvasData.ts`.
- **Browser SQLite** — `canvasDb()` in `src/api/canvasApi.ts`. Add tables to `SCHEMA` and bump `version` (this discards saved data). `db.transaction()` rolls back on error.
- **Mock controls** — fail the next file load; reset local data.

## Code map

- [App shell](src/components/canvas/CanvasApp.tsx): toolbar, artboard list, properties panel, focus/zoom logic, URL.
- [Canvas](src/components/canvas/CanvasView.tsx), [renderer](src/components/canvas/ArtboardSvg.tsx), [viewport math](src/components/canvas/viewport.ts).
- [Mock API](src/api/canvasApi.ts), [fixtures](src/data/canvasData.ts), [types](src/types/canvas.ts).

## Mock API contract

- `getDocument(id?)` → `{ id, name, revision, artboards, updatedAt }`.
- `subscribeToDocument(listener)` for document changes.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
