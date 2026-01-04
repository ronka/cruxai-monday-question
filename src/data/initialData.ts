import { Board } from '@/types/board';

export const initialBoard: Board = {
  id: 'board-1',
  name: 'Project Management',
  groups: [
    {
      id: 'group-1',
      name: 'To Do',
      color: 'hsl(195, 100%, 45%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-1', name: 'Design homepage mockup', status: 'working', person: 'Alex', date: new Date('2026-01-10') },
        { id: 'task-2', name: 'Set up project repository', status: 'done', person: 'Jordan', date: new Date('2026-01-05') },
        { id: 'task-3', name: 'Write documentation', status: 'waiting', person: null, date: new Date('2026-01-15') },
      ],
    },
    {
      id: 'group-2',
      name: 'In Progress',
      color: 'hsl(35, 100%, 50%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-4', name: 'Implement authentication', status: 'stuck', person: 'Sam', date: new Date('2026-01-08') },
        { id: 'task-5', name: 'Create API endpoints', status: 'working', person: 'Taylor', date: new Date('2026-01-12') },
      ],
    },
    {
      id: 'group-3',
      name: 'Completed',
      color: 'hsl(145, 65%, 42%)',
      isCollapsed: false,
      tasks: [
        { id: 'task-6', name: 'Project kickoff meeting', status: 'done', person: 'Alex', date: new Date('2026-01-02') },
      ],
    },
  ],
};
