import { BellPlus, BellRing } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { formatReminder, toLocalInputValue } from '../model';
import { IconAction } from './IconAction';

function at(daysFromNow: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function presets(now = new Date()) {
  const list: { label: string; date: Date }[] = [];
  if (now.getHours() < 17) list.push({ label: 'Later today', date: at(0, 18) });
  list.push({ label: 'Tomorrow', date: at(1, 8) });
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  list.push({ label: 'Next week', date: at(daysToMonday, 8) });
  return list;
}

export function ReminderPicker({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const choose = (iso: string | null) => {
    onChange(iso);
    setOpen(false);
  };

  const saveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const date = new Date(custom);
    if (!custom || Number.isNaN(date.getTime())) return setError('Pick a date and time');
    if (date.getTime() <= Date.now()) return setError('Pick a time in the future');
    choose(date.toISOString());
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setCustom(toLocalInputValue(value));
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <IconAction label={value ? `Reminder: ${formatReminder(value)}` : 'Remind me'}>
          {value ? <BellRing /> : <BellPlus />}
        </IconAction>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-[13px] font-semibold mb-2 text-muted-foreground">Remind me</p>
        <div className="flex flex-col">
          {presets().map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => choose(p.date.toISOString())}
              className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span>{p.label}</span>
              <span className="text-[11px] text-muted-foreground">{formatReminder(p.date.toISOString())}</span>
            </button>
          ))}
        </div>
        <form onSubmit={saveCustom} className="mt-3 border-t pt-3">
          <label htmlFor="reminder-custom" className="text-[13px] font-semibold text-muted-foreground">
            Pick date &amp; time
          </label>
          <Input
            id="reminder-custom"
            type="datetime-local"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'reminder-error' : undefined}
            className="mt-1.5"
          />
          {error ? (
            <p id="reminder-error" role="alert" className="mt-1.5 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex justify-between gap-2">
            {value ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => choose(null)}>
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
