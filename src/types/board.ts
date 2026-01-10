export type StatusType = 'working' | 'stuck' | 'done' | 'waiting' | 'none';

export interface Task {
  id: string;
  name: string;
  status: StatusType;
  person: string | null;
  date: string | null; // ISO string format
  estimation: string | null;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
  isCollapsed: boolean;
}

export interface Board {
  id: string;
  name: string;
  groups: Group[];
}

export const STATUS_CONFIG: Record<StatusType, { label: string; color: string }> = {
  working: { label: 'Working on it', color: 'hsl(35, 100%, 50%)' },
  stuck: { label: 'Stuck', color: 'hsl(0, 80%, 55%)' },
  done: { label: 'Done', color: 'hsl(145, 65%, 42%)' },
  waiting: { label: 'Waiting', color: 'hsl(280, 60%, 55%)' },
  none: { label: '', color: 'hsl(220, 10%, 75%)' },
};

export const PEOPLE = [
  { id: '1', name: 'Alex', avatar: 'A' },
  { id: '2', name: 'Jordan', avatar: 'J' },
  { id: '3', name: 'Sam', avatar: 'S' },
  { id: '4', name: 'Taylor', avatar: 'T' },
];

export const GROUP_COLORS = [
  'hsl(195, 100%, 45%)',
  'hsl(145, 65%, 42%)',
  'hsl(280, 60%, 55%)',
  'hsl(35, 100%, 50%)',
  'hsl(0, 80%, 55%)',
  'hsl(210, 80%, 55%)',
];
