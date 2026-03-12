import { Board, Group, Task, GROUP_COLORS } from '@/types/board';
import { initialBoard } from '@/data/initialData';

// In-memory store — simulates a real server
let boardData: Board = JSON.parse(JSON.stringify(initialBoard));

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function normalizeEstimation(value: string | null | undefined): string | null {
  if (value == null) return null;
  const map: Record<string, string> = {
    '1d': '8h',
    '2d': '16h',
    '1w': '5d',
    '2w': '10d',
  };
  if (map[value]) return map[value];
  // "N days" → "Nd"
  const daysMatch = value.match(/^(\d+)\s*days?$/i);
  if (daysMatch) return `${daysMatch[1]}d`;
  // bare number → append "h"
  if (/^\d+$/.test(value)) return `${value}h`;
  // everything else passes through unchanged
  return value;
}

// TODO: Call this on mount to load the board
export async function getBoard(): Promise<Board> {
  await delay(400);
  return JSON.parse(JSON.stringify(boardData));
}

// TODO: Call this when any task field is edited
export async function updateTask(
  groupId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  await delay(200);
  const group = boardData.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group ${groupId} not found`);
  const task = group.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  Object.assign(task, updates);

  // Server owns normalization
  if ('estimation' in updates) {
    task.estimation = normalizeEstimation(updates.estimation);
  }

  return JSON.parse(JSON.stringify(task));
}

// TODO: Call this when the user clicks "Add task"
export async function addTask(groupId: string): Promise<Task> {
  await delay(200);
  const group = boardData.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group ${groupId} not found`);
  const newTask: Task = {
    id: `task-${Date.now()}`,
    name: '',
    status: 'none',
    person: null,
    date: null,
    estimation: null,
  };
  group.tasks.push(newTask);
  return JSON.parse(JSON.stringify(newTask));
}

// TODO: Call this when the user deletes a task
export async function deleteTask(groupId: string, taskId: string): Promise<void> {
  await delay(200);
  const group = boardData.groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group ${groupId} not found`);
  group.tasks = group.tasks.filter((t) => t.id !== taskId);
}

// TODO: Call this when the user clicks "Add new group"
export async function addGroup(): Promise<Group> {
  await delay(200);
  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name: 'New Group',
    color: GROUP_COLORS[boardData.groups.length % GROUP_COLORS.length],
    isCollapsed: false,
    tasks: [],
  };
  boardData.groups.push(newGroup);
  return JSON.parse(JSON.stringify(newGroup));
}
