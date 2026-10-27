import { Loader2, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppDispatch } from '@/app/store';
import { fetchNotes } from '@/app/store/notesSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/shared/api/ApiError';
import type { NoteCollaborator, NoteCollaboratorsResponse, NotesListItem, Permission } from '@/shared/types';

import { inviteCollaborator, listCollaborators, removeCollaborator, updateCollaboratorPermission } from '../api';
import { IconAction } from './IconAction';

const selectClass =
  'h-9 cursor-pointer rounded-md border border-input bg-transparent px-2 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function CollaboratorsDialog({ note, onClose }: { note: NotesListItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!note} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">{note ? <SharePanel key={note.id} note={note} /> : null}</DialogContent>
    </Dialog>
  );
}

function SharePanel({ note }: { note: NotesListItem }) {
  const dispatch = useAppDispatch();
  const [data, setData] = useState<NoteCollaboratorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<Permission>('view');
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const noteId = note.id;

  const reload = useCallback(async () => {
    try {
      setData(await listCollaborators(noteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load collaborators');
    }
  }, [noteId]);

  useEffect(() => {
    let alive = true;
    listCollaborators(noteId)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Failed to load collaborators'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [noteId]);

  const run = async (action: () => Promise<void>, success?: string) => {
    setError(null);
    try {
      await action();
      await reload();
      void dispatch(fetchNotes());
      if (success) toast(success);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      return false;
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Enter a valid email address.');
    setInviting(true);
    const ok = await run(() => inviteCollaborator(noteId, { email: address, permission }), `Invitation sent to ${address}`);
    setInviting(false);
    if (ok) setEmail('');
  };

  const setPerm = (c: NoteCollaborator, p: Permission) => {
    void run(() => updateCollaboratorPermission(noteId, c.user.id, p));
  };
  const remove = (c: NoteCollaborator) => {
    void run(() => removeCollaborator(noteId, c.user.id), `${c.user.username} removed`);
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Share “{note.title}”</DialogTitle>
          <DialogDescription>People you invite get an invitation they can accept from their inbox.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onInvite} noValidate className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="invite-email" className="sr-only">
            Collaborator email
          </label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="name@example.com"
            autoComplete="email"
            aria-invalid={!!error}
            aria-describedby={error ? 'share-error' : undefined}
            className="sm:flex-1"
          />
          <label htmlFor="invite-permission" className="sr-only">
            Permission
          </label>
          <select id="invite-permission" value={permission} onChange={(e) => setPermission(e.target.value as Permission)} className={selectClass}>
            <option value="view">Can view</option>
            <option value="edit">Can edit</option>
          </select>
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="animate-spin" /> : <UserPlus />} Invite
          </Button>
        </form>
        {error ? (
          <p id="share-error" role="alert" className="-mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div>
          <p className="text-[13px] font-semibold mb-2 text-muted-foreground">People with access</p>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : data ? (
            <ul className="divide-y divide-border">
              <li className="flex items-center gap-3 py-2.5">
                <Initial name={data.owner.username} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{data.owner.username}</p>
                  <p className="truncate text-xs text-muted-foreground">{data.owner.email}</p>
                </div>
                <Badge variant="outline" className="text-[13px] font-semibold">
                  Owner
                </Badge>
              </li>
              {data.collaborators.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Initial name={c.user.username} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.user.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.user.email}</p>
                  </div>
                  {c.status === 'pending' ? (
                    <Badge variant="outline" className="text-[13px] font-semibold text-brand">
                      Pending
                    </Badge>
                  ) : null}
                  <label htmlFor={`perm-${c.id}`} className="sr-only">
                    Permission for {c.user.username}
                  </label>
                  <select id={`perm-${c.id}`} value={c.permission} onChange={(e) => setPerm(c, e.target.value as Permission)} className={selectClass}>
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                  </select>
                  <IconAction label={`Remove ${c.user.username}`} onClick={() => remove(c)} className="hover:text-destructive">
                    <X />
                  </IconAction>
                </li>
              ))}
            </ul>
          ) : null}
          {data && !data.collaborators.length ? <p className="py-1 text-sm text-muted-foreground">Not shared with anyone yet.</p> : null}
        </div>
    </>
  );
}
