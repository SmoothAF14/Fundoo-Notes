import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { fetchLabels } from '../../app/store/labelsSlice';
import { fetchNotes } from '../../app/store/notesSlice';
import { acceptInvitation, declineInvitation, listPendingInvitations } from '../../features/notes/api';
import { apiRequest } from '../api/http';
import type { PendingInvitation } from '../types';
import { Alert } from '../ui/Alert';
import { Avatar, PermissionBadge } from '../ui/Badge';
import { Brand } from '../ui/Brand';
import { Button, IconButton, Spinner } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const LIST_PATHS = ['/app/notes', '/app/shared'];

function navClass(active: boolean): string {
  return [
    'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    active ? 'bg-primary-soft text-primary-hover' : 'text-subtle hover:bg-muted hover:text-ink',
  ].join(' ');
}

function SideLink({ to, icon, children, onNavigate }: { to: string; icon: IconName; children: React.ReactNode; onNavigate?: () => void }) {
  return (
    <NavLink to={to} end onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
      <Icon name={icon} className="h-[18px] w-[18px]" />
      {children}
    </NavLink>
  );
}

function Sidebar({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  const labels = useAppSelector((s) => s.labels.items);
  const location = useLocation();
  const [params] = useSearchParams();
  const activeLabel = location.pathname === '/app/notes' ? params.get('label') : null;

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <SideLink to="/app/notes" icon="note" onNavigate={onNavigate}>
        My notes
      </SideLink>
      <SideLink to="/app/shared" icon="users" onNavigate={onNavigate}>
        Shared with me
      </SideLink>
      <SideLink to="/app/labels" icon="tag" onNavigate={onNavigate}>
        Manage labels
      </SideLink>

      <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Labels</p>
      <div className="mt-1 flex flex-col gap-0.5">
        {labels.length ? (
          labels.map((l) => (
            <NavLink
              key={l.label_id}
              to={`/app/notes?label=${encodeURIComponent(l.title)}`}
              onClick={onNavigate}
              className={() => navClass(activeLabel === l.title)}
              title={l.title}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
              <span className="truncate">{l.title}</span>
            </NavLink>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-faint">No labels yet</p>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-subtle transition-colors duration-200 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </nav>
  );
}

function SearchBox() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onList = LIST_PATHS.includes(location.pathname);
  const value = onList ? params.get('q') ?? '' : '';

  const onChange = (q: string) => {
    const next = new URLSearchParams(onList ? params : undefined);
    if (q) next.set('q', q);
    else next.delete('q');
    const search = next.toString();
    navigate({ pathname: onList ? location.pathname : '/app/notes', search: search ? `?${search}` : '' }, { replace: onList });
  };

  return (
    <div className="relative w-full">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <label htmlFor="global-search" className="sr-only">
        Search notes
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes"
        className="h-11 w-full rounded-xl border border-transparent bg-muted pl-10 pr-4 text-sm text-ink placeholder:text-faint transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15"
      />
    </div>
  );
}

export function AppLayout() {
  const { token, clear, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [invitesOpen, setInvitesOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);

  useEffect(() => {
    if (token) dispatch(fetchLabels(token));
  }, [token, dispatch]);

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => setDrawerOpen(false), [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const onMenu = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setSidebarOpen((v) => !v);
    else setDrawerOpen((v) => !v);
  }, []);

  const onLogout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout/', { method: 'POST', token });
    } catch {
      // ignore: we sign out locally regardless
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  }, [token, clear, navigate]);

  const loadInvites = useCallback(async () => {
    if (!token) return;
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      setInvites(await listPendingInvitations(token));
    } catch {
      setInvitesError('Failed to load invitations');
    } finally {
      setInvitesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const respond = useCallback(
    async (inviteId: string, accept: boolean) => {
      if (!token) return;
      try {
        if (accept) {
          await acceptInvitation(token, inviteId);
          dispatch(fetchNotes(token));
        } else {
          await declineInvitation(token, inviteId);
        }
        await loadInvites();
      } catch {
        setInvitesError(accept ? 'Failed to accept invitation' : 'Failed to decline invitation');
      }
    },
    [token, dispatch, loadInvites]
  );

  const username = user?.username || 'User';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <IconButton icon="menu" label="Toggle navigation" onClick={onMenu} aria-expanded={drawerOpen || sidebarOpen} />
          <div className="hidden sm:block lg:w-52">
            <Brand />
          </div>
          <div className="mx-auto w-full max-w-2xl">
            <SearchBox />
          </div>
          <button
            type="button"
            onClick={() => {
              setInvitesOpen(true);
              void loadInvites();
            }}
            aria-label={`Invitations${invites.length ? `, ${invites.length} pending` : ''}`}
            title="Invitations"
            className="relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-subtle transition-colors duration-200 hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon name="inbox" />
            {invites.length ? (
              <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {invites.length}
              </span>
            ) : null}
          </button>
          <Avatar name={username} className="h-9 w-9 text-sm" />
        </div>
      </header>

      <div className="flex">
        <aside
          className={[
            'sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-white/60 px-3 py-5',
            sidebarOpen ? 'lg:block' : '',
          ].join(' ')}
        >
          <Sidebar onLogout={onLogout} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="animate-rise absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white px-3 py-4 shadow-lift">
            <div className="mb-4 flex items-center justify-between px-2">
              <Brand />
              <IconButton icon="x" label="Close navigation" onClick={() => setDrawerOpen(false)} />
            </div>
            <Sidebar onNavigate={() => setDrawerOpen(false)} onLogout={onLogout} />
          </aside>
        </div>
      ) : null}

      <Modal open={invitesOpen} title="Invitations" onClose={() => setInvitesOpen(false)}>
        {invitesError ? <Alert className="mb-4">{invitesError}</Alert> : null}
        {invitesLoading && !invites.length ? (
          <div className="flex items-center gap-2 py-4 text-sm text-subtle">
            <Spinner /> Loading…
          </div>
        ) : invites.length ? (
          <ul className="space-y-3">
            {invites.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={inv.from_user.username} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{inv.note.title}</p>
                    <p className="mt-0.5 text-xs text-subtle">
                      Shared by <span className="font-medium text-ink">{inv.from_user.username}</span>
                    </p>
                  </div>
                  <PermissionBadge permission={inv.permission} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void respond(inv.id, false)}>
                    Decline
                  </Button>
                  <Button size="sm" icon="check" onClick={() => void respond(inv.id, true)}>
                    Accept
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center">
            <p className="font-semibold text-ink">You're all caught up</p>
            <p className="mt-1 text-sm text-subtle">New share invitations will appear here.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
