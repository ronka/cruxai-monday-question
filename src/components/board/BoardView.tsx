"use client";

import { useState } from 'react';
import { Board, Group, Task, GROUP_COLORS } from '@/types/board';
import { GroupSection } from './GroupSection';
import { initialBoard } from '@/data/initialData';
import { Plus } from 'lucide-react';

export function BoardView() {
  const [board, setBoard] = useState<Board>(initialBoard);

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setBoard((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }));
  };

  const updateTask = (groupId: string, taskId: string, updates: Partial<Task>) => {
    setBoard((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId ? { ...t, ...updates } : t
              ),
            }
          : g
      ),
    }));
  };

  const deleteTask = (groupId: string, taskId: string) => {
    setBoard((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId
          ? { ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }
          : g
      ),
    }));
  };

  const addTask = (groupId: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: '',
      status: 'none',
      person: null,
      date: null,
    };

    setBoard((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, tasks: [...g.tasks, newTask] } : g
      ),
    }));
  };

  const addGroup = () => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: 'New Group',
      color: GROUP_COLORS[board.groups.length % GROUP_COLORS.length],
      isCollapsed: false,
      tasks: [],
    };

    setBoard((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">{board.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage your project tasks
        </p>
      </header>

      {/* Board content */}
      <main className="p-6 max-w-7xl mx-auto">
        {board.groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            onUpdateGroup={(updates) => updateGroup(group.id, updates)}
            onUpdateTask={(taskId, updates) => updateTask(group.id, taskId, updates)}
            onDeleteTask={(taskId) => deleteTask(group.id, taskId)}
            onAddTask={() => addTask(group.id)}
          />
        ))}

        {/* Add group button */}
        <button
          onClick={addGroup}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add new group
        </button>
      </main>
    </div>
  );
}
