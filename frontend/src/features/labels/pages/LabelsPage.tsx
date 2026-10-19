import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { addLabel, clearLabelsError, fetchLabels, removeLabel } from '../../../app/store/labelsSlice';
import { fetchNotes } from '../../../app/store/notesSlice';
import type { Label } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Button, IconButton, Spinner } from '../../../shared/ui/Button';
import { inputClass } from '../../../shared/ui/Field';
import { Icon } from '../../../shared/ui/Icon';
import { Modal } from '../../../shared/ui/Modal';
import { splitLabels } from '../../notes/components/NoteCard';

export function LabelsPage() {
  const { token } = useAuth();
  const dispatch = useAppDispatch();

  const labels = useAppSelector((s) => s.labels.items);
  const loading = useAppSelector((s) => s.labels.loading);
  const error = useAppSelector((s) => s.labels.error);
  const notes = useAppSelector((s) => s.notes.items);

  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchLabels(token));
    dispatch(fetchNotes(token));
  }, [token, dispatch]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    notes
      .filter((n) => n.access === 'owner')
      .forEach((n) => splitLabels(n.label_names).forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
    return map;
  }, [notes]);

  const onCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = title.trim();
      if (!token || !trimmed) return;
      setSaving(true);
      dispatch(clearLabelsError());
      try {
        await dispatch(addLabel({ token, title: trimmed })).unwrap();
        setTitle('');
      } catch {
        // error is surfaced from the store
      } finally {
        setSaving(false);
      }
    },
    [token, title, dispatch]
  );

  const confirmDelete = () => {
    if (!token || !deleteTarget) return;
    dispatch(clearLabelsError());
    dispatch(removeLabel({ token, labelId: deleteTarget.label_id })).then(() => dispatch(fetchNotes(token)));
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Labels</h1>
      <p className="mt-1 text-sm text-subtle">Group related notes so you can find them in one click.</p>

      <form onSubmit={onCreate} className="mt-6 flex gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
        <label htmlFor="new-label" className="sr-only">
          New label name
        </label>
        <input
          id="new-label"
          className={`${inputClass} border-transparent shadow-none focus:border-transparent`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Create a new label…"
          required
        />
        <Button type="submit" icon="plus" loading={saving}>
          Add
        </Button>
      </form>

      {error ? <Alert className="mt-4">{error}</Alert> : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        {loading && !labels.length ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-subtle">
            <Spinner /> Loading labels…
          </div>
        ) : labels.length ? (
          <ul className="divide-y divide-line">
            {labels.map((l) => {
              const count = counts.get(l.title) ?? 0;
              return (
                <li key={l.label_id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="tag" className="h-4 w-4" />
                  </span>
                  <Link
                    to={`/app/notes?label=${encodeURIComponent(l.title)}`}
                    className="min-w-0 flex-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="block truncate text-sm font-semibold text-ink hover:text-primary">{l.title}</span>
                    <span className="block text-xs text-subtle">
                      {count} {count === 1 ? 'note' : 'notes'}
                    </span>
                  </Link>
                  <IconButton icon="trash" label={`Delete label ${l.title}`} tone="danger" onClick={() => setDeleteTarget(l)} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-ink">No labels yet</p>
            <p className="mt-1 text-sm text-subtle">Create your first label above.</p>
          </div>
        )}
      </section>

      <Modal
        open={!!deleteTarget}
        title="Delete label?"
        size="sm"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon="trash" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-subtle">
          The label “<span className="font-semibold text-ink">{deleteTarget?.title}</span>” will be removed from all notes. The notes
          themselves are kept.
        </p>
      </Modal>
    </div>
  );
}
