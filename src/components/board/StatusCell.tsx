import { useState, useRef, useEffect } from 'react';
import { StatusType, STATUS_CONFIG } from '@/types/board';
import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: StatusType;
  onChange: (status: StatusType) => void;
}

export function StatusCell({ status, onChange }: StatusCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const config = STATUS_CONFIG[status];

  return (
    <div ref={dropdownRef} className="relative w-full h-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full flex items-center justify-center text-white text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
          {(Object.keys(STATUS_CONFIG) as StatusType[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white font-medium hover:opacity-90 transition-opacity",
                status === key && "ring-2 ring-inset ring-white/40"
              )}
              style={{ backgroundColor: STATUS_CONFIG[key].color }}
            >
              {STATUS_CONFIG[key].label || '—'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
