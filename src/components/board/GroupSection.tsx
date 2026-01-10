"use client";

import { useState } from 'react';
import { Group, Task } from '@/types/board';
import { TaskRow } from './TaskRow';
import { TextCell } from './TextCell';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupSectionProps {
  group: Group;
  onUpdateGroup: (updates: Partial<Group>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: () => void;
}

export function GroupSection({
  group,
  onUpdateGroup,
  onUpdateTask,
  onDeleteTask,
  onAddTask
}: GroupSectionProps) {
  const toggleCollapse = () => {
    onUpdateGroup({ isCollapsed: !group.isCollapsed });
  };

  return (
    <div className="mb-6" data-testid={`group-section-${group.id}`}>
      {/* Group header */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={toggleCollapse}
          className="p-1 hover:bg-accent rounded transition-colors"
          style={{ color: group.color }}
        >
          {group.isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        <h3
          className="text-lg font-semibold"
          style={{ color: group.color }}
        >
          {group.name}
        </h3>
        <span className="text-sm text-muted-foreground">
          {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {!group.isCollapsed && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {/* Column headers */}
          <div className="flex items-center bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: group.color }} />
            <div className="flex-1 min-w-[200px] px-3 py-2 border-r border-border">Task</div>
            <div className="w-[140px] px-3 py-2 border-r border-border text-center">Person</div>
            <div className="w-[140px] px-3 py-2 border-r border-border text-center">Status</div>
            <div className="w-[100px] px-3 py-2 border-r border-border text-center">Date</div>
            <div className="w-10" />
          </div>

          {/* Tasks */}
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              groupColor={group.color}
              onUpdate={(updates) => onUpdateTask(task.id, updates)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}

          {/* Add task row */}
          <div className="flex items-center border-b border-border last:border-b-0">
            <div className="w-1.5 h-10 flex-shrink-0 opacity-50" style={{ backgroundColor: group.color }} />
            <button
              onClick={onAddTask}
              className="flex-1 px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
