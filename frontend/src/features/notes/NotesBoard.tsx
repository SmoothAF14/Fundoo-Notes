import { Trash2 } from 'lucide-react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { deleteNoteForever, fetchNotes } from '@/app/store/notesSlice';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, type IllustrationName } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { NotesListItem } from '@/shared/types';

import { CollaboratorsDialog } from './components/CollaboratorsDialog';
import { Composer } from './components/Composer';
import { NoteCard } from './components/NoteCard';
import { NoteEditorDialog } from './components/NoteEditorDialog';
import { type BoardView, PINNABLE_VIEWS, notesForView } from './model';

export type ShellContext = { layout: 'grid' | 'list' };

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

const COPY: Record<BoardView, { eyebrow: string; title: string; empty: string; hint: string; art: IllustrationName }> = {
  notes: { eyebrow: 'Workspace', title: 'Notes', empty: 'Notes you add appear here', hint: 'Use “Take a note…” above to capture your first one.', art: 'notes' },
  reminders: { eyebrow: 'Workspace', title: 'Reminders', empty: 'No reminders yet', hint: 'Add a reminder from a note’s bell icon and it will show up here.', art: 'reminders' },
  shared: { eyebrow: 'Workspace', title: 'Shared with me', empty: 'Nothing shared with you', hint: 'Notes appear here after you accept an invitation from your inbox.', art: 'shared' },
  archive: { eyebrow: 'Workspace', title: 'Archive', empty: 'Your archived notes appear here', hint: 'Archive notes to keep them without cluttering your board.', art: 'archive' },
  trash: { eyebrow: 'Workspace', title: 'Trash', empty: 'Trash is empty', hint: 'Notes you move to the trash stay here until you restore or delete them.', art: 'trash' },
  label: { eyebrow: 'Label', title: '', empty: 'No notes with this label yet', hint: 'Notes you create here get this label automatically.', art: 'label' },
  search: { eyebrow: 'Search', title: 'Results', empty: 'No matching notes', hint: 'Try a different word, or check the spelling.', art: 'search' },
};

function BoardSkeleton({ layout }: { layout: ShellContext['layout'] }) {
  return (
    <div className={cn(layout === 'grid' ? 'masonry columns-1 sm:columns-2 lg:columns-3 2xl:columns-4' : 'mx-auto max-w-2xl space-y-4')} aria-busy="true" aria-label="Loading notes">
      {[120, 180, 96, 150, 210, 110].map((h, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 w-full" style={{ height: h - 60 }} />
        </div>
      ))}
    </div>
  );
}

export function NotesBoard({ view }: { view: BoardView }) {
  const { layout } = useOutletContext<ShellContext>();
  const { user } = useAuth();
  const { name: labelName = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const dispatch = useAppDispatch();

  const notes = useAppSelector((s) => s.notes.items);
  const loaded = useAppSelector((s) => s.notes.loaded);
  const loading = useAppSelector((s) => s.notes.loading);
  const loadError = useAppSelector((s) => s.notes.error);
  const labels = useAppSelector((s) => s.labels.items);
  const [sharing, setSharing] = useState<NotesListItem | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  // The card currently morphing into / out of the editor dialog.
  const [morphId, setMorphId] = useState<string | null>(null);

  const visible = useMemo(() => notesForView(notes, view, labels, { labelName, query }), [notes, view, labels, labelName, query]);
  const openId = params.get('note');
  const openNote = notes.find((n) => n.id === openId) ?? null;

  // Keep the shared layoutId on the card just long enough for the close animation.
  useEffect(() => {
    if (openId) return;
    const t = window.setTimeout(() => setMorphId(null), 700);
    return () => window.clearTimeout(t);
  }, [openId]);

  // The open note lives in the URL (?note=<id>) so it survives refresh and the back button closes it.
  const setOpen = useCallback(
    (note: NotesListItem | null) => {
      const next = new URLSearchParams(params);
      if (note) setMorphId(note.id);
      if (note) next.set('note', note.id);
      else next.delete('note');
      setParams(next, { replace: !note });
    },
    [params, setParams]
  );

  const label = labels.find((l) => l.title.toLowerCase() === labelName.toLowerCase());
  const copy = COPY[view];
  const title = view === 'label' ? labelName : view === 'search' ? (query ? `“${query}”` : 'Search') : copy.title;
  const pinnable = PINNABLE_VIEWS.includes(view);
  const dueToday = visible.filter((n) => n.reminder_at && new Date(n.reminder_at).toDateString() === new Date().toDateString()).length;
  const summary = [
    `${visible.length} ${visible.length === 1 ? 'note' : 'notes'}`,
    pinnable && visible.some((n) => n.pinned) ? `${visible.filter((n) => n.pinned).length} pinned` : '',
    dueToday ? `${dueToday} reminder${dueToday === 1 ? '' : 's'} today` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const pinned = pinnable ? visible.filter((n) => n.pinned) : [];
  const others = pinnable ? visible.filter((n) => !n.pinned) : visible;

  const emptyTrash = async () => {
    const results = await Promise.allSettled(visible.map((n) => dispatch(deleteNoteForever({ id: n.id })).unwrap()));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) toast.error(`${failed} note${failed === 1 ? '' : 's'} could not be deleted`);
    else toast('Trash emptied');
  };

  const grid = (items: NotesListItem[], offset = 0) => (
    <div className={cn(layout === 'grid' ? 'masonry columns-1 sm:columns-2 lg:columns-3 2xl:columns-4' : 'mx-auto flex max-w-2xl flex-col gap-4')}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((n, i) => (
          <NoteCard key={n.id} note={n} index={i + offset} hidden={n.id === openNote?.id} morph={n.id === morphId} onOpen={setOpen} onShare={setSharing} />
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <Page>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="display break-words text-[clamp(48px,7vw,96px)]">
            {view === 'notes' ? (
              <>
                {greeting()}, <span className="text-brand">{user?.username ?? 'there'}.</span>
              </>
            ) : view === 'label' ? (
              <>
                <span className="text-brand">#</span>
                {title}
              </>
            ) : (
              `${title}${view === 'search' ? '' : '.'}`
            )}
          </h1>
          <p className="mt-4 text-base text-muted-foreground" aria-live="polite">
            {loaded ? summary : 'Loading your notes…'}
          </p>
        </div>
        {view === 'trash' && visible.length ? (
          <Button variant="outline" onClick={() => setConfirmEmpty(true)} className="border-destructive text-destructive hover:bg-destructive hover:text-white">
            <Trash2 /> Empty trash
          </Button>
        ) : null}
      </header>

      {view === 'notes' || (view === 'label' && label) ? (
        <div className="mb-10">
          <Composer key={label?.label_id ?? 'all'} defaultLabels={label ? [label.label_id] : []} />
        </div>
      ) : null}

      {!loaded && loadError && !loading ? (
        <EmptyState illustration={copy.art} title="Couldn’t load your notes">
          <p>{loadError}</p>
          <Button variant="outline" className="mt-5" onClick={() => void dispatch(fetchNotes())}>
            Try again
          </Button>
        </EmptyState>
      ) : !loaded ? (
        <BoardSkeleton layout={layout} />
      ) : view === 'label' && !label ? (
        <EmptyState illustration="label" title="Label not found">
          It may have been renamed or deleted.
        </EmptyState>
      ) : view === 'search' && !query.trim() ? (
        <EmptyState illustration="search" title="Search your notes">
          Type in the search box above — titles, text and labels all count.
        </EmptyState>
      ) : !visible.length ? (
        <EmptyState illustration={copy.art} title={copy.empty}>
          {copy.hint}
        </EmptyState>
      ) : (
        <LayoutGroup>
          {pinned.length ? (
            <section aria-labelledby="pinned-heading" className="mb-10">
              <h2 id="pinned-heading" className="mb-4 font-display text-2xl font-extrabold tracking-[-0.03em]">
                Pinned
              </h2>
              {grid(pinned)}
            </section>
          ) : null}
          <section aria-labelledby={pinned.length ? 'others-heading' : undefined}>
            {pinned.length && others.length ? (
              <h2 id="others-heading" className="mb-4 font-display text-2xl font-extrabold tracking-[-0.03em]">
                Others
              </h2>
            ) : null}
            {grid(others, pinned.length)}
          </section>
        </LayoutGroup>
      )}

      <NoteEditorDialog note={openNote} onClose={() => setOpen(null)} onShare={setSharing} />
      <CollaboratorsDialog note={sharing} onClose={() => setSharing(null)} />
      <ConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title="Empty trash?"
        description={`All ${visible.length} notes in the trash will be permanently deleted. This can’t be undone.`}
        confirmLabel="Empty trash"
        onConfirm={() => void emptyTrash()}
      />
    </Page>
  );
}
