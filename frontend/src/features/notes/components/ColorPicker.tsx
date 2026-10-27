import { Check, Palette } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { NoteColor } from '@/shared/types';

import { NOTE_COLORS, noteStyle } from '../model';
import { IconAction } from './IconAction';

type ColorProps = { value: NoteColor; onChange: (color: NoteColor) => void };

/** The colour swatches as a radio group; shown inline in the editor and inside the card popover. */
export function ColorSwatches({ value, onChange }: ColorProps) {
  return (
    <div role="radiogroup" aria-label="Note colour" className="grid grid-cols-5 gap-2">
      {NOTE_COLORS.map((c) => {
        const selected = c.value === value;
        return (
          <button
            key={c.value || 'default'}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.value)}
            style={noteStyle(c.value)}
            className={cn(
              'flex size-9 cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              selected ? 'border-outline' : 'border-black/10'
            )}
          >
            {selected ? <Check className="size-4" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange }: ColorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconAction label="Background colour">
          <Palette />
        </IconAction>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Colour</p>
        <ColorSwatches value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
