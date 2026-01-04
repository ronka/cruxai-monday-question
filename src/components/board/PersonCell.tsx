import { useState, useRef, useEffect } from 'react';
import { PEOPLE } from '@/types/board';
import { cn } from '@/lib/utils';

interface PersonCellProps {
  person: string | null;
  onChange: (person: string | null) => void;
}

export function PersonCell({ person, onChange }: PersonCellProps) {
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

  const selectedPerson = PEOPLE.find(p => p.name === person);

  return (
    <div ref={dropdownRef} className="relative w-full h-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full px-3 py-2 flex items-center justify-center gap-2 hover:bg-accent/50 transition-colors"
      >
        {selectedPerson ? (
          <>
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              {selectedPerson.avatar}
            </div>
            <span className="text-sm">{selectedPerson.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden">
          <button
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors text-muted-foreground"
          >
            No one
          </button>
          {PEOPLE.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.name);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-accent transition-colors",
                person === p.name && "bg-accent"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                {p.avatar}
              </div>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
