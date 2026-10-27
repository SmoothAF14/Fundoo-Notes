import { Archive, ArchiveRestore, BellRing, MoreVertical, Pin, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { useAppSelector } from '@/app/store';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EASE, springLayout } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { NotesListItem } from '@/shared/types';

import { formatReminder, isOverdue, noteLabelTitles, noteStyle } from '../model';
import { useNoteActions } from '../useNoteActions';
import { ColorPicker } from './ColorPicker';
import { IconAction } from './IconAction';
import { LabelPicker } from './LabelPicker';
import { ReminderPicker } from './ReminderPicker';

type NoteCardProps = {
  note: NotesListItem;
  index: number;
  /** True while this note is open in the editor dialog (the dialog owns the shared layoutId then). */
  hidden?: boolean;
  /** Share the card↔editor layoutId. Only the card being opened/closed gets it, so moves between sections exit cleanly. */
  morph?: boolean;
  onOpen: (note: NotesListItem) => void;
  onShare: (note: NotesListItem) => void;
};

export function NoteCard({ note, index, hidden, morph, onOpen, onShare }: NoteCardProps) {
  const labels = useAppSelector((s) => s.labels.items);
  const actions = useNoteActions();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = note.access === 'owner';
  const canOpen = isOwner || note.access === 'edit' || note.access === 'view';
  const titles = noteLabelTitles(note, labels);
  const overdue = isOverdue(note.reminder_at);

  return (
    <motion.article
      layout="position"
      layoutId={morph && !hidden ? `note-${note.id}` : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: hidden ? 0 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ ...springLayout, opacity: { duration: 0.22, ease: EASE, delay: Math.min(index, 12) * 0.03 } }}
      style={noteStyle(note.color)}
      className={cn(
        // Hover lift is CSS: a motion whileHover would fight the exit animation and strand exiting cards.
        'group relative rounded-[30px] p-6 pb-3 ring-1 ring-black/[0.06] transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_6px_0_rgb(18_18_18/0.9)]',
        hidden && 'pointer-events-none'
      )}
      aria-hidden={hidden || undefined}
    >
      {/* Whole-card hit area that opens the editor; real controls sit above it. */}
      {canOpen ? (
        <button
          type="button"
          id={`open-note-${note.id}`}
          onClick={() => onOpen(note)}
          className="absolute inset-0 z-0 cursor-pointer rounded-[30px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`Open note: ${note.title}`}
        />
      ) : null}

      <div className="pointer-events-none relative z-10">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 break-words pr-9 font-display text-[25px] font-extrabold leading-[1.02] tracking-[-0.035em]">{note.title}</h3>
        </div>
        <p className="mt-2.5 line-clamp-[10] whitespace-pre-wrap break-words text-[15px] leading-relaxed opacity-85">{note.content}</p>

        {titles.length || note.reminder_at || !isOwner || note.collaborators.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {note.reminder_at ? (
              <span className={cn('note-chip', overdue && 'line-through')}>
                <BellRing className="size-3" aria-hidden="true" />
                {formatReminder(note.reminder_at)}
              </span>
            ) : null}
            {titles.map((t) => (
              <span key={t} className="note-chip">
                {t}
              </span>
            ))}
            {!isOwner ? (
              <span className="note-chip">
                <Users className="size-3" aria-hidden="true" />
                {note.owner.name} · {note.access === 'edit' ? 'can edit' : 'view only'}
              </span>
            ) : note.collaborators.length ? (
              <span className="note-chip" title={note.collaborators.map((c) => c.name).join(', ')}>
                <Users className="size-3" aria-hidden="true" />
                Shared with {note.collaborators.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOwner && !note.trashed ? (
        <div className="absolute right-3 top-3 z-10">
          <IconAction
            label={note.pinned ? 'Unpin note' : 'Pin note'}
            pressed={note.pinned}
            onClick={() => actions.togglePin(note)}
            className={cn(
              'opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
              note.pinned && 'opacity-100'
            )}
          >
            <Pin className={cn(note.pinned && 'fill-current')} />
          </IconAction>
        </div>
      ) : null}

      {isOwner ? (
        <div
          className="relative z-10 -ml-2 mt-3 flex items-center gap-0.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
          role="toolbar"
          aria-label={`Actions for ${note.title}`}
        >
          {note.trashed ? (
            <>
              <IconAction label="Restore" onClick={() => actions.restore(note)}>
                <RotateCcw />
              </IconAction>
              <IconAction label="Delete forever" onClick={() => setConfirmDelete(true)} className="">
                <Trash2 />
              </IconAction>
            </>
          ) : (
            <>
              <ReminderPicker value={note.reminder_at} onChange={(iso) => actions.setReminder(note, iso)} />
              <ColorPicker value={note.color} onChange={(c) => actions.setColor(note, c)} />
              <LabelPicker value={note.labels} onChange={(ids) => actions.setLabels(note, ids)} />
              {note.archived ? (
                <IconAction label="Unarchive" onClick={() => actions.unarchive(note)}>
                  <ArchiveRestore />
                </IconAction>
              ) : (
                <IconAction label="Archive" onClick={() => actions.archive(note)}>
                  <Archive />
                </IconAction>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconAction label="More actions">
                    <MoreVertical />
                  </IconAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => onShare(note)}>
                    <UserPlus /> Share
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => actions.trash(note)}>
                    <Trash2 /> Move to trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      ) : (
        <div className="h-2" />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete forever?"
        description={
          <>
            “{note.title}” will be permanently deleted for you and everyone it’s shared with. This can’t be undone.
          </>
        }
        confirmLabel="Delete forever"
        onConfirm={() => void actions.remove(note)}
      />
    </motion.article>
  );
}
