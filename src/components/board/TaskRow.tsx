"use client";

import { Task, StatusType } from '@/types/board';
import { StatusCell } from './StatusCell';
import { TextCell } from './TextCell';
import { DateCell } from './DateCell';
import { PersonCell } from './PersonCell';
import { Trash2 } from 'lucide-react';

interface TaskRowProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  groupColor: string;
}

export function TaskRow({ task, onUpdate, onDelete, groupColor }: TaskRowProps) {
  return (
    <div className="flex items-stretch border-b border-border group hover:bg-accent/30 transition-colors">
      {/* Color indicator */}
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: groupColor }} />

      {/* Task name */}
      <div className="flex-1 min-w-[200px] border-r border-border">
        <TextCell
          value={task.name}
          onChange={(name) => onUpdate({ name })}
          placeholder="+ Add task"
        />
      </div>

      {/* Person */}
      <div className="w-[140px] border-r border-border">
        <PersonCell
          person={task.person}
          onChange={(person) => onUpdate({ person })}
        />
      </div>

      {/* Status */}
      <div className="w-[140px] border-r border-border">
        <StatusCell
          status={task.status}
          onChange={(status) => onUpdate({ status })}
        />
      </div>

      {/* Date */}
      <div className="w-[100px] border-r border-border">
        <DateCell
          date={task.date ? new Date(task.date) : null}
          onChange={(date) => onUpdate({ date: date ? date.toISOString() : null })}
        />
      </div>

      {/* Delete button */}
      <div className="w-10 flex items-center justify-center">
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
