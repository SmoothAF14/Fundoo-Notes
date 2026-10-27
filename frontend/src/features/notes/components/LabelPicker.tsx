import { Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { addLabel } from '@/app/store/labelsSlice';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { IconAction } from './IconAction';

export function LabelPicker({ value, onChange }: { value: number[]; onChange: (labelIds: number[]) => void }) {
  const dispatch = useAppDispatch();
  const labels = useAppSelector((s) => s.labels.items);
  const [filter, setFilter] = useState('');

  const q = filter.trim();
  const shown = labels.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()));
  const exact = labels.some((l) => l.title.toLowerCase() === q.toLowerCase());

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const create = async () => {
    if (!q) return;
    try {
      const label = await dispatch(addLabel({ title: q })).unwrap();
      onChange([...value, label.label_id]);
      setFilter('');
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <Popover onOpenChange={(o) => o && setFilter('')}>
      <PopoverTrigger asChild>
        <IconAction label="Labels">
          <Tag />
        </IconAction>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <label htmlFor="label-filter" className="text-[13px] font-semibold text-muted-foreground">
          Label note
        </label>
        <Input
          id="label-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q && !exact) {
              e.preventDefault();
              void create();
            }
          }}
          placeholder="Search or create"
          className="mt-1.5 h-9"
          maxLength={100}
        />
        <ul className="mt-2 max-h-56 overflow-y-auto">
          {shown.map((l) => (
            <li key={l.label_id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <input
                  type="checkbox"
                  checked={value.includes(l.label_id)}
                  onChange={() => toggle(l.label_id)}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="truncate">{l.title}</span>
              </label>
            </li>
          ))}
        </ul>
        {q && !exact ? (
          <button
            type="button"
            onClick={() => void create()}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <Plus className="size-4" /> Create “{q}”
          </button>
        ) : null}
        {!labels.length && !q ? <p className="px-2 py-1.5 text-sm text-muted-foreground">Type to create your first label.</p> : null}
      </PopoverContent>
    </Popover>
  );
}
