import { Archive, ArchiveRestore, Pin } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { useAppSelector } from '@/app/store';
import { Button } from '@/components/ui/button';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { NoteColor } from '@/shared/types';

import { formatReminder, noteStyle } from '../model';
import { useNoteActions } from '../useNoteActions';
import { ColorPicker } from './ColorPicker';
import { IconAction } from './IconAction';
import { LabelPicker } from './LabelPicker';
import { ReminderPicker } from './ReminderPicker';

type Draft = {
  title: string;
  content: string;
  color: NoteColor;
  labels: number[];
  reminder_at: string | null;
  pinned: boolean;
  archived: boolean;
};

const EMPTY: Draft = { title: '', content: '', color: '', labels: [], reminder_at: null, pinned: false, archived: false };

/** "Take a note…" bar that expands into a full composer. `defaultLabels` pre-selects the current label view. */
export function Composer({ defaultLabels = [] }: { defaultLabels?: number[] }) {
  const actions = useNoteActions();
  const labels = useAppSelector((s) => s.labels.items);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, labels: defaultLabels });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };
  const isBlank = !draft.title.trim() && !draft.content.trim();

  const reset = () => {
    setDraft({ ...EMPTY, labels: defaultLabels });
    setError(null);
    setOpen(false);
  };

  const close = async () => {
    if (saving) return;
    if (isBlank) return reset();
    // The API needs both a title and a body.
    if (!draft.title.trim() || !draft.content.trim()) {
      setError(!draft.title.trim() ? 'Add a title to save this note.' : 'Write something in the note to save it.');
      (draft.title.trim() ? rootRef.current?.querySelector('textarea') : titleRef.current)?.focus();
      return;
    }
    setSaving(true);
    const ok = await actions.create({
      title: draft.title.trim(),
      content: draft.content.trim(),
      color: draft.color,
      labels: draft.labels,
      reminder_at: draft.reminder_at,
      pinned: draft.pinned,
      archived: draft.archived,
    });
    setSaving(false);
    if (ok) reset();
  };

  // Clicking outside an open composer saves it, like Keep. Popovers render in portals, so ignore those.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (rootRef.current?.contains(target) || target.closest('[data-radix-popper-content-wrapper],[role="dialog"]')) return;
      void close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  const chosenLabels = labels.filter((l) => draft.labels.includes(l.label_id));

  return (
    <motion.form
      ref={rootRef}
      layout
      transition={{ duration: 0.22, ease: EASE }}
      onSubmit={(e) => {
        e.preventDefault();
        void close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          void close();
        }
      }}
      style={open ? noteStyle(draft.color) : undefined}
      className={cn(
        'w-full max-w-2xl transition-colors',
        open ? 'rounded-[30px] border-2 border-outline shadow-[0_6px_0_var(--outline)]' : 'rounded-full border-2 border-dashed border-foreground/25 hover:border-foreground/60'
      )}
      aria-label="Create a note"
    >
      {open ? (
        <div className="px-6 pt-4">
          <div className="flex items-start gap-2">
            <label htmlFor="composer-title" className="sr-only">
              Title
            </label>
            <input
              id="composer-title"
              ref={titleRef}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Title"
              maxLength={100}
              autoFocus
              className="min-w-0 flex-1 bg-transparent py-1.5 font-display text-[26px] font-extrabold tracking-[-0.035em] placeholder:text-current placeholder:opacity-40 focus:outline-none"
            />
            <IconAction label={draft.pinned ? 'Unpin' : 'Pin'} pressed={draft.pinned} onClick={() => set({ pinned: !draft.pinned })} className="">
              <Pin className={cn(draft.pinned && 'fill-current')} />
            </IconAction>
          </div>
          <label htmlFor="composer-content" className="sr-only">
            Note
          </label>
          <textarea
            id="composer-content"
            value={draft.content}
            onChange={(e) => set({ content: e.target.value })}
            placeholder="Take a note…"
            rows={3}
            className="field-sizing-content block max-h-[50vh] min-h-24 w-full resize-none bg-transparent py-1 text-[15px] leading-relaxed placeholder:text-current placeholder:opacity-50 focus:outline-none"
          />
          {draft.reminder_at || chosenLabels.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.reminder_at ? (
                <span className="note-chip">{formatReminder(draft.reminder_at)}</span>
              ) : null}
              {chosenLabels.map((l) => (
                <span key={l.label_id} className="note-chip">
                  {l.title}
                </span>
              ))}
            </div>
          ) : null}
          <AnimatePresence>
            {error ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-2 text-xs text-destructive"
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <div className="-mx-1.5 mt-2 flex items-center gap-0.5 pb-2">
            <ReminderPicker value={draft.reminder_at} onChange={(reminder_at) => set({ reminder_at })} />
            <ColorPicker value={draft.color} onChange={(color) => set({ color })} />
            <LabelPicker value={draft.labels} onChange={(ids) => set({ labels: ids })} />
            <IconAction label={draft.archived ? 'Don’t archive' : 'Archive'} pressed={draft.archived} onClick={() => set({ archived: !draft.archived, pinned: false })}>
              {draft.archived ? <ArchiveRestore /> : <Archive />}
            </IconAction>
            <Button type="submit" size="sm" className="ml-auto bg-ink text-paper hover:bg-ink/90" disabled={saving}>
              {saving ? 'Saving…' : 'Close'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          className="w-full cursor-text rounded-full px-7 py-4 text-left text-base text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Take a note…
        </button>
      )}
    </motion.form>
  );
}
