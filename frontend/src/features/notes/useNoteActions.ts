import { useCallback } from 'react';
import { toast } from 'sonner';

import { useAppDispatch } from '@/app/store';
import { createNote, deleteNoteForever, updateNote } from '@/app/store/notesSlice';
import type { NotePatch, NotesListItem } from '@/shared/types';

/** Note mutations with optimistic updates, toast feedback and Undo. */
export function useNoteActions() {
  const dispatch = useAppDispatch();

  const patch = useCallback(
    async (id: string, change: NotePatch) => {
      try {
        await dispatch(updateNote({ id, patch: change })).unwrap();
        return true;
      } catch (err) {
        toast.error(String(err));
        return false;
      }
    },
    [dispatch]
  );

  /** Apply a change and offer to put the previous values back. */
  const patchWithUndo = useCallback(
    async (note: NotesListItem, change: NotePatch, message: string) => {
      const previous = Object.fromEntries(Object.keys(change).map((k) => [k, note[k as keyof NotePatch]])) as NotePatch;
      if (await patch(note.id, change)) {
        toast(message, { action: { label: 'Undo', onClick: () => void patch(note.id, previous) } });
      }
    },
    [patch]
  );

  const remove = useCallback(
    async (note: NotesListItem) => {
      try {
        await dispatch(deleteNoteForever({ id: note.id })).unwrap();
        toast('Note deleted forever');
      } catch (err) {
        toast.error(String(err));
      }
    },
    [dispatch]
  );

  const create = useCallback(
    async (note: NotePatch & { title: string; content: string }) => {
      try {
        const created = await dispatch(createNote({ note })).unwrap();
        toast(note.archived ? 'Note created and archived' : 'Note created', {
          action: { label: 'Undo', onClick: () => void dispatch(deleteNoteForever({ id: created.id })) },
        });
        return true;
      } catch (err) {
        toast.error(String(err));
        return false;
      }
    },
    [dispatch]
  );

  return {
    patch,
    create,
    remove,
    togglePin: (n: NotesListItem) => void patch(n.id, n.archived ? { pinned: !n.pinned, archived: false } : { pinned: !n.pinned }),
    archive: (n: NotesListItem) => void patchWithUndo(n, { archived: true, pinned: false }, 'Note archived'),
    unarchive: (n: NotesListItem) => void patchWithUndo(n, { archived: false }, 'Note unarchived'),
    trash: (n: NotesListItem) => void patchWithUndo(n, { trashed: true, pinned: false }, 'Note moved to trash'),
    restore: (n: NotesListItem) => void patchWithUndo(n, { trashed: false }, 'Note restored'),
    setColor: (n: NotesListItem, color: NotesListItem['color']) => void patch(n.id, { color }),
    setReminder: (n: NotesListItem, reminder_at: string | null) =>
      void patchWithUndo(n, { reminder_at }, reminder_at ? 'Reminder set' : 'Reminder removed'),
    setLabels: (n: NotesListItem, labels: number[]) => void patch(n.id, { labels }),
  };
}
