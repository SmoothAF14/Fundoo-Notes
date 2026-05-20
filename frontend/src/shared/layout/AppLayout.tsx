import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../app/providers/useAuth';
import { apiRequest } from '../api/http';
import type { Label } from '../types';
import { listLabels } from '../../features/labels/api';
import { acceptInvitation, declineInvitation, listPendingInvitations } from '../../features/notes/api';
import type { PendingInvitation } from '../types';

function SidebarLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'block rounded-full px-4 py-2 border transition',
          isActive
            ? 'bg-amber-100 border-amber-200 text-slate-900'
            : 'bg-transparent border-transparent hover:bg-slate-200/60 text-slate-800',
        ].join(' ')
      }
      end
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
}

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      className="rounded-full p-2 bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
    >
      <span className="block h-0.5 w-5 bg-slate-700" />
      <span className="block h-0.5 w-5 bg-slate-700 mt-1" />
      <span className="block h-0.5 w-5 bg-slate-700 mt-1" />
    </button>
  );
}

function SidebarNav({ onNavigate, labels }: { onNavigate?: () => void; labels: Label[] }) {
  return (
    <nav className="space-y-1">
      <SidebarLink to="/app/notes" onClick={onNavigate}>Notes</SidebarLink>
      <SidebarLink to="/app/shared" onClick={onNavigate}>Shared Notes</SidebarLink>
      <SidebarLink to="/app/labels" onClick={onNavigate}>Labels</SidebarLink>

      <div className="pt-3" />

      <div className="px-2">
        <div className="text-[11px] font-semibold tracking-wider text-slate-500">LABELS</div>
      </div>

      <div className="space-y-1">
        {labels.length ? (
          labels.map((l) => (
            <div
              key={l.label_id}
              className="rounded-full px-4 py-2 text-sm bg-white border border-slate-200 text-slate-700"
              title={l.title}
            >
              {l.title}
            </div>
          ))
        ) : (
          <div className="px-4 py-2 text-sm text-slate-500">No labels</div>
        )}
      </div>
    </nav>
  );
}

function SidebarPanel({
  labels,
  onNavigate,
  onLogout,
}: {
  labels: Label[];
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="h-10 w-10 rounded-2xl bg-amber-200 flex items-center justify-center border border-amber-300">
          <span className="text-sm font-semibold text-slate-900">FN</span>
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold">Fundoo Notes</div>
          <div className="text-xs text-slate-500">Smart Workspace</div>
        </div>
      </div>

      <div className="mt-4">
        <SidebarNav labels={labels} onNavigate={onNavigate} />
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-full px-4 py-2 font-semibold bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { token, clear, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [labels, setLabels] = useState<Label[]>([]);

  const [invitesOpen, setInvitesOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);

  const onHamburger = useCallback(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setSidebarOpen((v) => !v);
    } else {
      setMobileMenuOpen((v) => !v);
    }
  }, []);

  const onLogout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout/', { method: 'POST', token });
    } catch {
      // ignore
    } finally {
      clear();
      navigate('/login', { replace: true });
    }
  }, [token, clear, navigate]);

  const loadLabels = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listLabels(token);
      setLabels(data);
    } catch {
      setLabels([]);
    }
  }, [token]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  useEffect(() => {
    const onRefresh = () => void loadLabels();
    window.addEventListener('fundoo:labels-refresh', onRefresh);
    return () => window.removeEventListener('fundoo:labels-refresh', onRefresh);
  }, [loadLabels]);

  const loadInvites = useCallback(async () => {
    if (!token) return;
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      const data = await listPendingInvitations(token);
      setInvites(data);
    } catch {
      setInvitesError('Failed to load invitations');
    } finally {
      setInvitesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (!invitesOpen) return;
    void loadInvites();
  }, [invitesOpen, loadInvites, token]);

  useEffect(() => {
    if (!token) return;
    void loadInvites();
  }, [token, loadInvites]);

  useEffect(() => {
    const onRefresh = () => {
      void loadInvites();
    };
    window.addEventListener('fundoo:invites-refresh', onRefresh);
    return () => window.removeEventListener('fundoo:invites-refresh', onRefresh);
  }, [invitesOpen, loadInvites]);

  const onAcceptInvite = useCallback(
    async (inviteId: string) => {
      if (!token) return;
      try {
        await acceptInvitation(token, inviteId);
        window.dispatchEvent(new Event('fundoo:notes-refresh'));
        window.dispatchEvent(new Event('fundoo:invites-refresh'));
      } catch {
        setInvitesError('Failed to accept invitation');
      }
    },
    [token]
  );

  const onDeclineInvite = useCallback(
    async (inviteId: string) => {
      if (!token) return;
      try {
        await declineInvitation(token, inviteId);
        window.dispatchEvent(new Event('fundoo:invites-refresh'));
      } catch {
        setInvitesError('Failed to decline invitation');
      }
    },
    [token]
  );

  const userInitial = useMemo(() => {
    const name = (user?.username || '').trim();
    return name ? name[0]!.toUpperCase() : 'U';
  }, [user?.username]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3">
          <div className="w-full">
            <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm flex items-center gap-3">
              <HamburgerButton open={mobileMenuOpen || !sidebarOpen} onClick={onHamburger} />

              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-amber-200 flex items-center justify-center border border-amber-300 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">FN</span>
                </div>
                <div className="leading-tight min-w-0">
                  <div className="text-base font-semibold truncate">Fundoo Notes</div>
                  <div className="text-xs text-slate-500 truncate">Smart Workspace</div>
                </div>
              </div>

              <div className="hidden sm:flex flex-1">
                <input
                  className="w-full rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder-slate-500 focus:outline-none"
                  placeholder="Search notes..."
                />
              </div>

              <button
                type="button"
                onClick={() => setInvitesOpen(true)}
                className="ml-auto rounded-full px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                title="Pending invitations"
              >
                Invites{invites.length ? ` (${invites.length})` : ''}
              </button>

              <button
                type="button"
                aria-label="User"
                className="rounded-full h-10 w-10 bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700"
                title={user?.username || 'User'}
              >
                {userInitial}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pb-10">
        <div className="w-full pt-6">
          <div className="flex items-start gap-6">
            <aside className={sidebarOpen ? 'hidden md:block w-72 shrink-0' : 'hidden md:hidden'}>
              <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
                <SidebarPanel labels={labels} onLogout={onLogout} />
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile drawer */}
      <div className={mobileMenuOpen ? 'md:hidden fixed inset-0 z-30' : 'md:hidden hidden'}>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute inset-0 bg-slate-900/20"
        />
        <aside className="absolute left-0 top-0 h-full w-80 bg-white border-r border-slate-200 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-full">
            <SidebarPanel
              labels={labels}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={onLogout}
            />
          </div>
        </aside>
      </div>

      {/* Invitations modal */}
      <div className={invitesOpen ? 'fixed inset-0 z-40 flex items-center justify-center' : 'hidden'}>
        <button
          type="button"
          aria-label="Close invitations"
          onClick={() => setInvitesOpen(false)}
          className="absolute inset-0 bg-slate-900/20"
        />
        <div className="relative w-[min(680px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="font-semibold">Pending Invitations</div>
            <button
              type="button"
              onClick={() => setInvitesOpen(false)}
              className="rounded-full px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              Close
            </button>
          </div>

          <div className="p-5">
            {invitesError ? (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
                <span className="font-semibold text-rose-700">Error:</span>{' '}
                <span className="text-slate-800">{invitesError}</span>
              </div>
            ) : null}

            {invitesLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : invites.length ? (
              <div className="space-y-3">
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{inv.note.title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          From: <span className="font-medium text-slate-700">{inv.from_user.username}</span>
                        </div>
                      </div>
                      <span
                        className={
                          inv.permission === 'edit'
                            ? 'rounded-full px-3 py-1 text-xs bg-rose-100 border border-rose-200 text-rose-700'
                            : 'rounded-full px-3 py-1 text-xs bg-sky-100 border border-sky-200 text-sky-700'
                        }
                      >
                        {inv.permission === 'edit' ? 'Can Edit' : 'Can View'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => void onAcceptInvite(inv.id)}
                        className="rounded-full px-4 py-2 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 transition border border-emerald-200"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeclineInvite(inv.id)}
                        className="rounded-full px-4 py-2 text-xs font-semibold bg-rose-100 hover:bg-rose-200 transition border border-rose-200"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No pending invitations.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
