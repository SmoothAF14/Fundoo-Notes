import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { NotesListItem } from '../../../shared/types';
import { Avatar, Badge, PermissionBadge } from '../../../shared/ui/Badge';
import { IconButton } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';

export function splitLabels(labelNames: string): string[] {
  return (labelNames || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

type NoteCardProps = {
  note: NotesListItem;
  onDelete: (note: NotesListItem) => void;
  onShare: (note: NotesListItem) => void;
};

export function NoteCard({ note, onDelete, onShare }: NoteCardProps) {
  const navigate = useNavigate();
  const isOwner = note.access === 'owner';
  const canEdit = isOwner || note.access === 'edit';
  const labels = splitLabels(note.label_names);

  return (
    <article className="animate-rise group relative rounded-2xl border border-line bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-lift">
      {!isOwner ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-xs text-subtle">
            <Avatar name={note.owner.name} className="h-6 w-6 text-[11px]" />
            <span className="truncate">{note.owner.name}</span>
          </span>
          {note.access === 'view' || note.access === 'edit' ? <PermissionBadge permission={note.access} /> : null}
        </div>
      ) : null}

      <h3 className="break-words text-base font-semibold leading-snug text-ink">
        {canEdit ? (
          <Link
            to={`/app/notes/${note.id}/edit`}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {note.title}
          </Link>
        ) : (
          note.title
        )}
      </h3>

      <p className="mt-2 line-clamp-[8] whitespace-pre-wrap break-words text-sm leading-relaxed text-subtle">{note.content}</p>

      {labels.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {labels.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex -space-x-2">
          {note.collaborators.slice(0, 4).map((c) => (
            <Avatar key={c.email || c.name} name={`${c.name} · ${c.permission === 'edit' ? 'can edit' : 'can view'}`} className="h-7 w-7 text-[11px]" />
          ))}
          {note.collaborators.length > 4 ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-subtle ring-2 ring-white">
              +{note.collaborators.length - 4}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5">
          {canEdit ? <IconButton icon="pencil" label="Edit note" onClick={() => navigate(`/app/notes/${note.id}/edit`)} /> : null}
          {isOwner ? (
            <>
              <IconButton icon="userPlus" label="Share note" onClick={() => onShare(note)} />
              <IconButton icon="trash" label="Delete note" tone="danger" onClick={() => onDelete(note)} />
            </>
          ) : null}
          {!canEdit ? (
            <span className="inline-flex items-center gap-1 px-2 text-xs text-subtle">
              <Icon name="eye" className="h-4 w-4" /> View only
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function NoteCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-hidden="true">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
