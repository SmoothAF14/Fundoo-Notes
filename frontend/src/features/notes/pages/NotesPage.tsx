import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { clearNotesError, fetchNotes, removeNote } from '../../../app/store/notesSlice';
import type { NotesListItem } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Button, buttonClass } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { Modal } from '../../../shared/ui/Modal';
import { CollaboratorsModal } from '../components/CollaboratorsModal';
import { NoteCard, NoteCardSkeleton, splitLabels } from '../components/NoteCard';

export function NotesPage({ mode = 'personal' }: { mode?: 'personal' | 'shared' }) {
  const { token } = useAuth();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();

  const notes = useAppSelector((s) => s.notes.items);
  const loading = useAppSelector((s) => s.notes.loading);
  const error = useAppSelector((s) => s.notes.error);

  const [shareNote, setShareNote] = useState<NotesListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotesListItem | null>(null);

  const query = (params.get('q') || '').trim().toLowerCase();
  const labelFilter = params.get('label') || '';

  const load = useCallback(() => {
    if (token) dispatch(fetchNotes(token));
  }, [token, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleNotes = useMemo(
    () =>
      notes.filter((n) => {
        if (mode === 'shared' ? n.access === 'owner' : n.access !== 'owner') return false;
        if (labelFilter && !splitLabels(n.label_names).includes(labelFilter)) return false;
        if (!query) return true;
        return [n.title, n.content, n.label_names].some((s) => (s || '').toLowerCase().includes(query));
      }),
    [notes, mode, labelFilter, query]
  );

  const confirmDelete = () => {
    if (!token || !deleteTarget) return;
    dispatch(clearNotesError());
    dispatch(removeNote({ token, id: deleteTarget.id }));
    setDeleteTarget(null);
  };

  const clearFilter = (key: 'q' | 'label') => {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
  };

  const isShared = mode === 'shared';
  const filtered = !!(query || labelFilter);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{isShared ? 'Shared with me' : 'My notes'}</h1>
          <p className="mt-1 text-sm text-subtle">
            {loading ? 'Loading…' : `${visibleNotes.length} ${visibleNotes.length === 1 ? 'note' : 'notes'}`}
            {isShared ? ' others have shared with you' : ''}
          </p>
        </div>
        {isShared ? null : (
          <Link to="/app/notes/new" className={buttonClass('primary')}>
            <Icon name="plus" className="h-4 w-4" /> New note
          </Link>
        )}
      </div>

      {filtered ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-subtle">Filtered by</span>
          {labelFilter ? <FilterChip icon="tag" text={labelFilter} onClear={() => clearFilter('label')} /> : null}
          {query ? <FilterChip icon="search" text={`“${params.get('q')}”`} onClear={() => clearFilter('q')} /> : null}
        </div>
      ) : null}

      {error ? <Alert className="mt-5">{error}</Alert> : null}

      {loading && !notes.length ? (
        <div className="note-masonry mt-6 columns-1 sm:columns-2 xl:columns-3 2xl:columns-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <NoteCardSkeleton key={i} />
          ))}
        </div>
      ) : visibleNotes.length ? (
        <div className="note-masonry mt-6 columns-1 sm:columns-2 xl:columns-3 2xl:columns-4">
          {visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={setDeleteTarget} onShare={setShareNote} />
          ))}
        </div>
      ) : (
        <EmptyState shared={isShared} filtered={filtered} />
      )}

      {token ? <CollaboratorsModal token={token} note={shareNote} onClose={() => setShareNote(null)} onChanged={load} /> : null}

      <Modal
        open={!!deleteTarget}
        title="Delete note?"
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
          “<span className="font-semibold text-ink">{deleteTarget?.title}</span>” will be permanently deleted for you and everyone
          it's shared with.
        </p>
      </Modal>
    </div>
  );
}

function FilterChip({ icon, text, onClear }: { icon: 'tag' | 'search'; text: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-3 pr-1 font-medium text-primary-hover">
      <Icon name={icon} className="h-3.5 w-3.5" />
      {text}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${icon === 'tag' ? 'label' : 'search'} filter`}
        className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon name="x" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function EmptyState({ shared, filtered }: { shared: boolean; filtered: boolean }) {
  const [title, text] = filtered
    ? ['No matching notes', 'Try a different search or clear the filters.']
    : shared
      ? ['Nothing shared yet', 'When someone shares a note with you and you accept the invite, it shows up here.']
      : ['No notes yet', 'Capture your first idea — it only takes a second.'];

  return (
    <section className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon name={filtered ? 'search' : shared ? 'users' : 'note'} className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-subtle">{text}</p>
      {!shared && !filtered ? (
        <Link to="/app/notes/new" className={buttonClass('primary', 'md', 'mt-6')}>
          <Icon name="plus" className="h-4 w-4" /> Create a note
        </Link>
      ) : null}
    </section>
  );
}
