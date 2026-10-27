import { Check, Inbox, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppDispatch } from '@/app/store';
import { fetchNotes } from '@/app/store/notesSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { acceptInvitation, declineInvitation, listPendingInvitations } from '@/features/notes/api';
import type { PendingInvitation } from '@/shared/types';

export function Invitations() {
  const dispatch = useAppDispatch();
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvites(await listPendingInvitations());
    } catch {
      // The badge simply stays empty; opening the popover retries.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial badge count; setState only happens in the async callback.
  useEffect(() => {
    let alive = true;
    listPendingInvitations()
      .then((list) => alive && setInvites(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const respond = async (inv: PendingInvitation, accept: boolean) => {
    setBusy(inv.id);
    try {
      if (accept) {
        await acceptInvitation(inv.id);
        void dispatch(fetchNotes());
        toast(`“${inv.note.title}” added to Shared with me`);
      } else {
        await declineInvitation(inv.id);
        toast('Invitation declined');
      }
      setInvites((list) => list.filter((i) => i.id !== inv.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const label = invites.length ? `Invitations, ${invites.length} pending` : 'Invitations';
  return (
    <Popover onOpenChange={(o) => o && void load()}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={label} className="relative size-10 rounded-full">
              <Inbox />
              {invites.length ? (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                  {invites.length}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Invitations</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="text-[13px] font-semibold border-b px-4 py-3 text-muted-foreground">Invitations</p>
        {loading && !invites.length ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : invites.length ? (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {invites.map((inv) => (
              <li key={inv.id} className="px-4 py-3">
                <p className="truncate text-sm font-medium">{inv.note.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  from {inv.from_user.username}
                  <Badge variant="outline" className="text-[13px] font-semibold">
                    {inv.permission === 'edit' ? 'can edit' : 'can view'}
                  </Badge>
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" disabled={busy === inv.id} onClick={() => void respond(inv, false)}>
                    Decline
                  </Button>
                  <Button size="sm" disabled={busy === inv.id} onClick={() => void respond(inv, true)}>
                    <Check /> Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
