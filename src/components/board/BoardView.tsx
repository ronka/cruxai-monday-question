"use client";

import { Group, Task } from '@/types/board';
import { GroupSection } from './GroupSection';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  updateGroup as updateGroupAction,
  updateTask as updateTaskAction,
  deleteTask as deleteTaskAction,
  addTask as addTaskAction,
  addGroup as addGroupAction,
} from '@/store/slices/boardSlice';

export function BoardView() {
  const dispatch = useAppDispatch();
  const board = useAppSelector((state) => state.board.board);

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    dispatch(updateGroupAction({ groupId, updates }));
  };

  const updateTask = (groupId: string, taskId: string, updates: Partial<Task>) => {
    dispatch(updateTaskAction({ groupId, taskId, updates }));
  };

  const deleteTask = (groupId: string, taskId: string) => {
    dispatch(deleteTaskAction({ groupId, taskId }));
  };

  const addTask = (groupId: string) => {
    dispatch(addTaskAction({ groupId }));
  };

  const addGroup = () => {
    dispatch(addGroupAction());
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
