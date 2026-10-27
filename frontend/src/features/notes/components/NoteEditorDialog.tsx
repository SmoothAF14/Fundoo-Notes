import { Archive, ArchiveRestore, Pin, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useRef, useState } from 'react';

import { useAppSelector } from '@/app/store';
import { Button } from '@/components/ui/button';
import { EASE, springLayout } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { NotesListItem } from '@/shared/types';

import { formatReminder, isOverdue, noteLabelTitles, noteStyle } from '../model';
import { useNoteActions } from '../useNoteActions';
import { ColorSwatches } from './ColorPicker';
import { IconAction } from './IconAction';
import { LabelPicker } from './LabelPicker';
import { ReminderPicker } from './ReminderPicker';

type Props = {
  note: NotesListItem | null;
  onClose: () => void;
  onShare: (note: NotesListItem) => void;
};

/** Opened note: the note card grows out of the board (shared layoutId) with info cards beside it. Text saves on close. */
export function NoteEditorDialog({ note, onClose, onShare }: Props) {
  return (
    <DialogPrimitive.Root open={!!note} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>{note ? <EditorPanel key={note.id} note={note} onClose={onClose} onShare={onShare} /> : null}</AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** One of the small cards in the right-hand column. */
function InfoCard({ title, action, index, children }: { title: string; action?: React.ReactNode; index: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.28, ease: EASE, delay: 0.08 + index * 0.05 }}
      aria-label={title}
      className="rounded-[28px] border-2 border-outline bg-card p-5 text-card-foreground shadow-[0_4px_0_var(--outline)]"
    >
      <div className="flex min-h-10 items-center justify-between gap-2">
        <h3 className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{title}</h3>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </motion.section>
  );
}

const chip = 'inline-flex items-center rounded-full bg-foreground/[0.07] px-3 py-1 text-[13px] font-semibold';

function EditorPanel({ note, onClose, onShare }: { note: NotesListItem; onClose: () => void; onShare: (n: NotesListItem) => void }) {
  const actions = useNoteActions();
  const labels = useAppSelector((s) => s.labels.items);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isOwner = note.access === 'owner';
  const editable = !note.trashed && (isOwner || note.access === 'edit');
  const dirty = title !== note.title || content !== note.content;
  const labelTitles = noteLabelTitles(note, labels);
  const showInfo = !note.trashed;

  const requestClose = async () => {
    if (!editable || !dirty) return onClose();
    if (!title.trim() || !content.trim()) {
      setError(!title.trim() ? 'A note needs a title.' : 'A note needs some text.');
      return;
    }
    setSaving(true);
    // Collaborators can't attach the owner's labels, so only send the text fields.
    const ok = await actions.patch(note.id, { title: title.trim(), content: content.trim() });
    setSaving(false);
    if (ok) onClose();
  };

  const edited = new Date(note.updated_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <DialogPrimitive.Portal forceMount>
      <DialogPrimitive.Overlay asChild forceMount>
        <motion.div
          className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        />
      </DialogPrimitive.Overlay>
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
        <DialogPrimitive.Content
          asChild
          forceMount
          aria-describedby={undefined}
          // Radix would focus the title with its text selected, so the first keystroke would wipe it.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            panelRef.current?.focus({ preventScroll: true });
          }}
          // The dialog is opened from the URL, not a Radix trigger, so hand focus back to the card ourselves.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => document.getElementById(`open-note-${note.id}`)?.focus({ preventScroll: true }));
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            void requestClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            void requestClose();
          }}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className={cn(
              'pointer-events-auto grid max-h-[calc(100dvh-1.5rem)] w-full gap-4 overflow-y-auto overscroll-contain p-1 pb-3 focus:outline-none sm:max-h-[calc(100dvh-3rem)]',
              showInfo ? 'max-w-5xl lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start' : 'max-w-2xl'
            )}
          >
            <DialogPrimitive.Title className="sr-only">{editable ? 'Edit note' : note.title}</DialogPrimitive.Title>

            {/* The note card itself */}
            <motion.article
              layoutId={`note-${note.id}`}
              transition={springLayout}
              style={noteStyle(note.color)}
              className="flex min-h-[420px] flex-col overflow-hidden rounded-[36px] border-2 border-outline shadow-[0_8px_0_var(--outline)] lg:max-h-[min(86dvh,780px)]"
            >
              <div className="flex items-start gap-2 px-7 pt-7">
                {editable ? (
                  <>
                    <label htmlFor="editor-title" className="sr-only">
                      Title
                    </label>
                    <input
                      id="editor-title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setError(null);
                      }}
                      maxLength={100}
                      placeholder="Title"
                      className="min-w-0 flex-1 bg-transparent py-1.5 font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-none tracking-[-0.04em] placeholder:text-current placeholder:opacity-40 focus:outline-none"
                    />
                  </>
                ) : (
                  <p className="min-w-0 flex-1 py-1.5 font-display text-[clamp(30px,4vw,44px)] font-extrabold leading-none tracking-[-0.04em]">{note.title}</p>
                )}
                {isOwner && !note.trashed ? (
                  <IconAction label={note.pinned ? 'Unpin note' : 'Pin note'} pressed={note.pinned} onClick={() => actions.togglePin(note)}>
                    <Pin className={cn(note.pinned && 'fill-current')} />
                  </IconAction>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-7">
                {editable ? (
                  <>
                    <label htmlFor="editor-content" className="sr-only">
                      Note
                    </label>
                    <textarea
                      id="editor-content"
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        setError(null);
                      }}
                      placeholder="Start writing…"
                      className="field-sizing-content block min-h-56 w-full resize-none bg-transparent py-4 text-[17px] leading-relaxed placeholder:text-current placeholder:opacity-50 focus:outline-none"
                    />
                  </>
                ) : (
                  <p className="whitespace-pre-wrap break-words py-4 text-[17px] leading-relaxed">{note.content}</p>
                )}
                {error ? (
                  <p role="alert" className="pb-3 text-sm font-semibold">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t-2 border-[color-mix(in_srgb,currentColor_15%,transparent)] px-5 py-3.5">
                {isOwner && note.trashed ? (
                  <>
                    <Button size="sm" variant="outline" className="border-current" onClick={() => actions.restore(note)}>
                      <RotateCcw /> Restore
                    </Button>
                    <span className="text-[13px] font-semibold opacity-75">In trash · restore to edit</span>
                  </>
                ) : isOwner ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-current hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)] hover:text-current"
                      onClick={() => (note.archived ? actions.unarchive(note) : actions.archive(note))}
                    >
                      {note.archived ? <ArchiveRestore /> : <Archive />} {note.archived ? 'Unarchive' : 'Archive'}
                    </Button>
                    <IconAction
                      label="Move to trash"
                      onClick={() => {
                        actions.trash(note);
                        onClose();
                      }}
                    >
                      <Trash2 />
                    </IconAction>
                  </>
                ) : null}
                <span className="ml-auto hidden px-2 text-[13px] font-semibold opacity-70 sm:inline">Edited {edited}</span>
                <Button size="sm" onClick={() => void requestClose()} disabled={saving} className="ml-auto bg-ink text-paper hover:bg-ink/90 sm:ml-0">
                  {saving ? 'Saving…' : editable && dirty ? 'Save & close' : 'Close'}
                </Button>
              </div>
            </motion.article>

            {/* Info cards */}
            {showInfo ? (
              <div className="flex flex-col gap-4">
                {isOwner ? (
                  <>
                    <InfoCard index={0} title="Labels" action={<LabelPicker value={note.labels} onChange={(ids) => actions.setLabels(note, ids)} />}>
                      {labelTitles.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {labelTitles.map((t) => (
                            <span key={t} className={chip}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No labels yet.</p>
                      )}
                    </InfoCard>

                    <InfoCard index={1} title="Reminder" action={<ReminderPicker value={note.reminder_at} onChange={(iso) => actions.setReminder(note, iso)} />}>
                      {note.reminder_at ? (
                        <p className={cn('font-display text-xl font-extrabold tracking-[-0.03em]', isOverdue(note.reminder_at) && 'text-muted-foreground line-through')}>
                          {formatReminder(note.reminder_at)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No reminder. Add one to get an email at that time.</p>
                      )}
                    </InfoCard>

                    <InfoCard index={2} title="Colour">
                      <ColorSwatches value={note.color} onChange={(c) => actions.setColor(note, c)} />
                    </InfoCard>

                    <InfoCard
                      index={3}
                      title="Sharing"
                      action={
                        <IconAction label="Share" onClick={() => onShare(note)}>
                          <UserPlus />
                        </IconAction>
                      }
                    >
                      {note.collaborators.length ? (
                        <ul className="space-y-1.5">
                          {note.collaborators.map((c) => (
                            <li key={c.email || c.name} className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cobalt text-xs font-bold text-white">
                                  {c.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="truncate font-semibold">{c.name}</span>
                              </span>
                              <span className="shrink-0 text-muted-foreground">{c.permission === 'edit' ? 'can edit' : 'can view'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Only you. Share it to work on it together.</p>
                      )}
                    </InfoCard>
                  </>
                ) : (
                  <>
                    <InfoCard index={0} title="Shared with you">
                      <p className="text-sm">
                        <span className="font-semibold">{note.owner.name}</span> shared this note.{' '}
                        <span className="text-muted-foreground">You {note.access === 'edit' ? 'can edit the text' : 'can view it'}.</span>
                      </p>
                    </InfoCard>
                    {labelTitles.length ? (
                      <InfoCard index={1} title="Labels">
                        <div className="flex flex-wrap gap-1.5">
                          {labelTitles.map((t) => (
                            <span key={t} className={chip}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </InfoCard>
                    ) : null}
                    {note.reminder_at ? (
                      <InfoCard index={2} title="Reminder">
                        <p className="font-display text-xl font-extrabold tracking-[-0.03em]">{formatReminder(note.reminder_at)}</p>
                      </InfoCard>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}
