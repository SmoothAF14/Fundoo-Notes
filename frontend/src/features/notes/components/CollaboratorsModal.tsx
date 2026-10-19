import React, { useCallback, useEffect, useState } from 'react';

import { ApiError } from '../../../shared/api/ApiError';
import type { NoteCollaborator, NoteCollaboratorsResponse, NotesListItem } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Avatar, Badge, PermissionBadge } from '../../../shared/ui/Badge';
import { Button, IconButton, Spinner } from '../../../shared/ui/Button';
import { inputClass } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import { inviteCollaborator, listCollaborators, removeCollaborator, updateCollaboratorPermission } from '../api';

type Permission = 'view' | 'edit';

const selectClass =
  'h-10 cursor-pointer rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';

type Props = { token: string; note: NotesListItem | null; onClose: () => void; onChanged: () => void };

export function CollaboratorsModal({ token, note, onClose, onChanged }: Props) {
  const [data, setData] = useState<NoteCollaboratorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<Permission>('view');
  const [inviting, setInviting] = useState(false);

  const noteId = note?.id;
  const isOwner = note?.access === 'owner';

  const reload = useCallback(async () => {
    if (!noteId) return;
    try {
      setData(await listCollaborators(token, noteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load collaborators');
    }
  }, [token, noteId]);

  useEffect(() => {
    if (!noteId) return;
    setData(null);
    setError(null);
    setEmail('');
    setPermission('view');
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [noteId, reload]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError(null);
    try {
      await action();
      await reload();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallback);
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteId || !email.trim()) return;
    setInviting(true);
    await run(async () => {
      await inviteCollaborator(token, noteId, { email: email.trim(), permission });
      setEmail('');
    }, 'Failed to invite collaborator');
    setInviting(false);
  };

  const onPermission = (c: NoteCollaborator, p: Permission) => {
    if (noteId) void run(() => updateCollaboratorPermission(token, noteId, c.user.id, p), 'Failed to update permission');
  };

  const onRemove = (c: NoteCollaborator) => {
    if (noteId) void run(() => removeCollaborator(token, noteId, c.user.id), 'Failed to remove collaborator');
  };

  return (
    <Modal open={!!note} title={note ? `Share “${note.title}”` : 'Share'} onClose={onClose}>
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      {isOwner ? (
        <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="invite-email" className="sr-only">
            Collaborator email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={`${inputClass} h-10 py-0 sm:flex-1`}
            required
          />
          <label htmlFor="invite-permission" className="sr-only">
            Permission
          </label>
          <select
            id="invite-permission"
            value={permission}
            onChange={(e) => setPermission(e.target.value as Permission)}
            className={selectClass}
          >
            <option value="view">Can view</option>
            <option value="edit">Can edit</option>
          </select>
          <Button type="submit" size="sm" className="h-10" icon="userPlus" loading={inviting}>
            Invite
          </Button>
        </form>
      ) : null}

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-subtle">People with access</h3>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-subtle">
          <Spinner /> Loading…
        </div>
      ) : data ? (
        <ul className="mt-2 divide-y divide-line">
          <li className="flex items-center gap-3 py-3">
            <Avatar name={data.owner.username} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{data.owner.username}</p>
              <p className="truncate text-xs text-subtle">{data.owner.email || ''}</p>
            </div>
            <Badge tone="green">Owner</Badge>
          </li>

          {data.collaborators.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={c.user.username} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.user.username}</p>
                <p className="truncate text-xs text-subtle">{c.user.email || ''}</p>
              </div>
              {c.status !== 'accepted' ? <Badge tone={c.status === 'pending' ? 'orange' : 'neutral'}>{c.status}</Badge> : null}
              {isOwner ? (
                <div className="flex items-center gap-1">
                  <label htmlFor={`perm-${c.id}`} className="sr-only">
                    Permission for {c.user.username}
                  </label>
                  <select
                    id={`perm-${c.id}`}
                    value={c.permission}
                    onChange={(e) => onPermission(c, e.target.value as Permission)}
                    className={selectClass}
                  >
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                  </select>
                  <IconButton icon="x" label={`Remove ${c.user.username}`} tone="danger" onClick={() => onRemove(c)} />
                </div>
              ) : (
                <PermissionBadge permission={c.permission} />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {data && !data.collaborators.length ? <p className="pb-1 text-sm text-subtle">Not shared with anyone yet.</p> : null}
    </Modal>
  );
}
