# Canvas Review — version history and restore interview

A Figma-inspired frontend starter for a feature implementation interview. The app shows a design file with five artboards on a pannable, zoomable canvas. Artboard **names and positions are editable** (properties panel, or drag an artboard's name label); edits stay local until **Save**, which creates a new revision. The file has four seeded, immutable **version snapshots** (two named checkpoints, two autosaves), and saves detect when a teammate saved a newer revision. Data persists in browser SQLite. **The version-history UI and restore are the candidate's task and are not implemented.**

Template: **Canvas Review** (shared with the contextual-comments and batch-export questions).

## Run

```sh
npm ci
npm run dev -- -p 3002
```

Open http://localhost:3002.

## Task

1. Add a **version-history panel** listing versions (named checkpoints and autosaves) with author and time. Users can name the current state as a checkpoint.
2. Selecting a version shows a **read-only preview** on the canvas (no editing; clearly marked). **Returning to the current version** restores the user's view and preserves **unsaved local edits**.
3. **Restore** a version: first save the current state as a version, then create a **new current revision** with the restored content. Earlier history (including what came after the restored version) stays available.
4. Warn about **unsaved changes** before preview or restore, and handle a **newer revision** appearing (use **Teammate saves a newer revision**) before restore completes.
5. **Version links** (e.g. `?version=v-2`) load the requested snapshot after a fresh load, with a useful **missing-version** state.

Add meaningful tests for restore semantics, unsaved-edit preservation, and conflict handling.

## What the starter provides

- **Versions** — `listVersions(documentId?)` (newest first) and `getVersion(versionId)` (snapshot with artboards; rejects `Version not found`). Versions cannot be modified.
- **Saving** — `saveDocument(id, artboards, expectedRevision, label?)` writes a new revision plus a version; it rejects with `RevisionConflictError` (carrying the latest document) if the revision moved.
- **Editing** — `CanvasApp` keeps unsaved edits in `draft`; `CanvasView` supports `onMoveArtboard`.
- **Mock controls** — teammate saves a newer revision, fail the next save, fail the next file load, reset local data.
- **Canvas** — `CanvasView` (pan/zoom/select), `ArtboardSvg` renderer, viewport math in `viewport.ts`.

## Code map

- [App shell](src/components/canvas/CanvasApp.tsx): draft, save, toolbar, artboard list, properties panel.
- [Canvas](src/components/canvas/CanvasView.tsx), [renderer](src/components/canvas/ArtboardSvg.tsx), [viewport math](src/components/canvas/viewport.ts).
- [Mock API](src/api/canvasApi.ts), [fixtures](src/data/canvasData.ts), [types](src/types/canvas.ts).

## Mock API contract

- `getDocument(id?)`, `saveDocument(id, artboards, expectedRevision, label?)`.
- `listVersions(documentId?)`, `getVersion(versionId)`.
- `subscribeToDocument(listener)` emits `{ type: "document", documentId, revision }` after any save.

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
```
