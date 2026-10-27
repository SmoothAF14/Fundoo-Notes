import type { Label, NoteColor, NotesListItem } from '@/shared/types';

export const NOTE_COLORS: { value: NoteColor; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'sand', label: 'Butter' },
  { value: 'tide', label: 'Cobalt' },
  { value: 'sage', label: 'Mint' },
  { value: 'plum', label: 'Lilac' },
  { value: 'clay', label: 'Tomato' },
  { value: 'rose', label: 'Pink' },
  { value: 'moss', label: 'Lime' },
  { value: 'dusk', label: 'Inverse' },
];

/** Solid fill for a note plus the text colour that stays readable on it (see --note-* in index.css). */
export function noteStyle(color: NoteColor): React.CSSProperties {
  const key = color || 'default';
  const fg = ['default', 'tide', 'clay', 'dusk'].includes(key) ? `var(--note-${key}-fg)` : 'var(--note-fg)';
  return { background: `var(--note-${key})`, color: fg };
}

export type BoardView = 'notes' | 'reminders' | 'shared' | 'archive' | 'trash' | 'label' | 'search';

/**
 * Label titles to show on a note. Owners resolve ids against their live labels (so renames show
 * instantly); collaborators can't see the owner's labels, so they use the server's names.
 */
export function noteLabelTitles(note: NotesListItem, labels: Label[]): string[] {
  if (note.access === 'owner') {
    const byId = new Map(labels.map((l) => [l.label_id, l.title]));
    return note.labels.map((id) => byId.get(id)).filter((t): t is string => !!t);
  }
  return note.label_names
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function notesForView(
  notes: NotesListItem[],
  view: BoardView,
  labels: Label[],
  { labelName = '', query = '' }: { labelName?: string; query?: string } = {}
): NotesListItem[] {
  const q = query.trim().toLowerCase();
  const own = (n: NotesListItem) => n.access === 'owner';
  const filtered = notes.filter((n) => {
    switch (view) {
      case 'notes':
        return own(n) && !n.archived && !n.trashed;
      case 'reminders':
        return !n.trashed && !!n.reminder_at;
      case 'shared':
        return !own(n) && !n.trashed;
      case 'archive':
        return own(n) && n.archived && !n.trashed;
      case 'trash':
        return own(n) && n.trashed;
      case 'label':
        return own(n) && !n.trashed && noteLabelTitles(n, labels).some((t) => t.toLowerCase() === labelName.toLowerCase());
      case 'search':
        return (
          !n.trashed &&
          !!q &&
          [n.title, n.content, ...noteLabelTitles(n, labels)].some((s) => s.toLowerCase().includes(q))
        );
    }
  });
  if (view === 'reminders') {
    return filtered.sort((a, b) => Date.parse(a.reminder_at!) - Date.parse(b.reminder_at!));
  }
  return filtered;
}

/** Views that split notes into "Pinned" and "Others". */
export const PINNABLE_VIEWS: BoardView[] = ['notes', 'label'];

export function isOverdue(reminderAt: string | null, now = Date.now()): boolean {
  return !!reminderAt && Date.parse(reminderAt) < now;
}

export function formatReminder(reminderAt: string, now = new Date()): string {
  const d = new Date(reminderAt);
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Value for <input type="datetime-local"> in the user's timezone. */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
