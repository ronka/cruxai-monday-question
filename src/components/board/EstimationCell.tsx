"use client";

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface EstimationCellProps {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}

const normalizeEstimation = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)\s*(d|day|days)$/i);
  if (match) {
    return `${match[1]}d`;
  }
  return trimmed;
};

export function EstimationCell({ value, onChange, className }: EstimationCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value ?? '');
  }, [value]);

  const commitChange = () => {
    setIsEditing(false);
    const normalized = normalizeEstimation(editValue);
    if (normalized !== (value ?? '')) {
      onChange(normalized);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitChange();
    } else if (event.key === 'Escape') {
      setEditValue(value ?? '');
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "w-[120px] border-r border-border",
        className
      )}
      data-testid="task-estimation"
      onClick={() => setIsEditing(true)}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          onBlur={commitChange}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-3 py-2 bg-background border-2 border-primary outline-none text-sm text-center"
        />
      ) : (
        <div
          className={cn(
            "w-full h-full px-3 py-2 text-sm flex items-center justify-center",
            !(value ?? '') && "text-muted-foreground"
          )}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
}
