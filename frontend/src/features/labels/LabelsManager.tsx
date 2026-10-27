import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { addLabel, editLabel, removeLabel } from '@/app/store/labelsSlice';
import { fetchNotes } from '@/app/store/notesSlice';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { EASE } from '@/lib/motion';
import type { Label } from '@/shared/types';

import { IconAction } from '../notes/components/IconAction';

function validate(title: string, labels: Label[], except?: number): string | null {
  const t = title.trim();
  if (!t) return 'Enter a label name.';
  if (t.length > 100) return 'Keep it under 100 characters.';
  if (labels.some((l) => l.label_id !== except && l.title.toLowerCase() === t.toLowerCase())) return 'A label with this name already exists.';
  return null;
}

function LabelRow({ label, count, onNavigate }: { label: Label; count: number; onNavigate?: () => void }) {
  const dispatch = useAppDispatch();
  const labels = useAppSelector((s) => s.labels.items);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label.title);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const save = async () => {
    const problem = validate(value, labels, label.label_id);
    if (problem) return setError(problem);
    if (value.trim() === label.title) return setEditing(false);
    try {
      await dispatch(editLabel({ labelId: label.label_id, title: value.trim() })).unwrap();
      setEditing(false);
      toast('Label renamed');
    } catch (err) {
      setError(String(err));
    }
  };

  const remove = async () => {
    try {
      await dispatch(removeLabel({ labelId: label.label_id })).unwrap();
      void dispatch(fetchNotes());
      toast(`Label “${label.title}” deleted`);
    } catch (err) {
      toast.error(String(err));
    }
  };

  const inputId = `label-${label.label_id}`;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE }} className="py-1.5">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="flex items-center gap-1"
        >
          <label htmlFor={inputId} className="sr-only">
            Rename {label.title}
          </label>
          <Input
            id={inputId}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setEditing(false);
                setValue(label.title);
              }
            }}
            autoFocus
            maxLength={100}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-9"
          />
          <IconAction label="Save name" type="submit">
            <Check />
          </IconAction>
          <IconAction
            label="Cancel"
            onClick={() => {
              setEditing(false);
              setValue(label.title);
              setError(null);
            }}
          >
            <X />
          </IconAction>
        </form>
      ) : (
        <div className="group flex items-center gap-2">
          <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Link
            to={`/label/${encodeURIComponent(label.title)}`}
            onClick={onNavigate}
            className="min-w-0 flex-1 truncate rounded-sm py-1.5 text-sm hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {label.title}
          </Link>
          <span className="text-[13px] font-semibold text-muted-foreground">{count}</span>
          <IconAction label={`Rename ${label.title}`} onClick={() => setEditing(true)}>
            <Pencil />
          </IconAction>
          <IconAction label={`Delete ${label.title}`} onClick={() => setConfirm(true)} className="hover:text-destructive">
            <Trash2 />
          </IconAction>
        </div>
      )}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete label?"
        description={`“${label.title}” will be removed from all notes. The notes themselves are kept.`}
        confirmLabel="Delete label"
        onConfirm={() => void remove()}
      />
    </motion.li>
  );
}

/** Create, rename and delete labels. Used by the Labels page and the Edit labels dialog. */
export function LabelsManager({ onNavigate }: { onNavigate?: () => void }) {
  const dispatch = useAppDispatch();
  const labels = useAppSelector((s) => s.labels.items);
  const notes = useAppSelector((s) => s.notes.items);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = new Map<number, number>();
  notes.forEach((n) => n.access === 'owner' && !n.trashed && n.labels.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate(title, labels);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await dispatch(addLabel({ title: title.trim() })).unwrap();
      setTitle('');
      toast('Label created');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={create} noValidate className="flex items-center gap-1">
        <label htmlFor="new-label" className="sr-only">
          New label name
        </label>
        <Input
          id="new-label"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="Create new label"
          maxLength={100}
          aria-invalid={!!error}
          aria-describedby={error ? 'new-label-error' : undefined}
          className="h-10"
        />
        <IconAction label="Create label" type="submit" disabled={saving}>
          <Plus />
        </IconAction>
      </form>
      {error ? (
        <p id="new-label-error" role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="mt-3 divide-y divide-border">
        <AnimatePresence initial={false}>
          {labels.map((l) => (
            <LabelRow key={l.label_id} label={l} count={counts.get(l.label_id) ?? 0} onNavigate={onNavigate} />
          ))}
        </AnimatePresence>
      </ul>
      {!labels.length ? <p className="py-6 text-center text-sm text-muted-foreground">No labels yet. Create one above.</p> : null}
    </div>
  );
}
