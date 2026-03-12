# Monday Home Assignment Redesign

**Date:** 2026-03-12
**Status:** Approved

## Overview

Redesign the Monday board home assignment to require a 30-minute session, test technical architecture (not just feature delivery), and resist being solved in a single AI prompt.

The core mechanic: provide a mock API stub that the candidate must wire up. All mutations go through the API. The API owns estimation normalization and returns the normalized value — the candidate must reflect what the server returns, not compute it themselves.

---

## Assignment Prompt (given to candidates)

```
Extend the Monday board with an Estimations column.

Requirements:
1. Wire up the provided mock API (src/api/boardApi.ts) — the app should
   load its data from the API and all mutations should go through it.

2. Add an Estimation column to each task row. Users can type a value
   like "2d", "1w", or "5" directly in the cell.

3. The API handles normalization. Your UI should reflect whatever
   the API returns after an update.

Notes:
- Do not modify src/api/boardApi.ts
- Handle loading state — the board should not render until data is fetched
- All existing functionality (status, person, date) must continue to work
```

---

## What to Provide to the Candidate

### Mock API stub — `src/api/boardApi.ts`

Pre-implemented but presented with `// TODO` comments to guide wiring. Candidate does **not** modify this file.

```ts
export async function getBoard(): Promise<Board>
export async function updateTask(groupId: string, taskId: string, updates: Partial<Task>): Promise<Task>
export async function addTask(groupId: string): Promise<Task>
export async function deleteTask(groupId: string, taskId: string): Promise<void>
export async function addGroup(): Promise<Group>
```

`updateTask` applies normalization before returning:

| Input | Normalized |
|-------|-----------|
| `1d`  | `8h`      |
| `2d`  | `16h`     |
| `1w`  | `5d`      |
| `2w`  | `10d`     |
| `5`   | `5h`      |
| invalid | passthrough (no error) |

---

## Required Changes

### 1. Redux Slice

**BoardState before:**
```ts
interface BoardState {
  board: Board; // seeded from initialData.ts
}
```

**BoardState after:**
```ts
interface BoardState {
  board: Board | null;
  loading: boolean;
  error: string | null;
}
```

All synchronous reducers replaced with `createAsyncThunk` thunks:

| Thunk | API call | State update |
|-------|----------|-------------|
| `fetchBoard` | `getBoard()` | sets `board` |
| `updateTaskAsync` | `updateTask()` | merges returned task (with normalized estimation) |
| `addTaskAsync` | `addTask()` | appends returned task to group |
| `deleteTaskAsync` | `deleteTask()` | removes task from state |
| `addGroupAsync` | `addGroup()` | appends returned group |

Thunks wired via `extraReducers` with `pending`/`fulfilled`/`rejected` handling.

### 2. Types

Add `estimation: string | null` to the `Task` interface in `src/types/board.ts`.

### 3. UI — EstimationCell

New `src/components/board/EstimationCell.tsx` — editable inline cell, similar to `TextCell`. On blur/enter, dispatches `updateTaskAsync` with raw user input. Displays whatever the store reflects after the server responds.

Column added to `TaskRow` and the header row in `GroupSection`.

---

## What This Tests

**For all levels:**
- Can they wire async data flow end-to-end (fetch on mount, update on edit)?
- Do they handle loading state (board null before fetch completes)?

**Architectural signal (separates junior from senior):**
A candidate who normalizes estimation on the frontend will have their value overwritten by the server response. The correct solution trusts the server — fire the update, wait for the returned task, reflect it. This reveals whether they understand client/server responsibility boundaries.

**Senior stretch:**
- Do they colocate thunks in the slice or split them?
- Do they handle `extraReducers` cleanly vs. bolting on side effects?
- Do they type the thunk payloads properly?

---

## What Does NOT Need to Change

- The mock API implementation itself (provided, not editable)
- Existing columns (status, person, date) — must keep working
- UI aesthetics — no design work required
