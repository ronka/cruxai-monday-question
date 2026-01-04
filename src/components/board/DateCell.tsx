import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateCellProps {
  date: Date | null;
  onChange: (date: Date | null) => void;
}

export function DateCell({ date, onChange }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full h-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors",
            !date && "text-muted-foreground"
          )}
        >
          {date ? format(date, 'MMM d') : '—'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={(newDate) => {
            onChange(newDate ?? null);
            setIsOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
