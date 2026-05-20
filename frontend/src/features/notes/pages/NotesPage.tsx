import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { ApiError } from '../../../shared/api/ApiError';
import type { Label, NoteCollaborator, NoteCollaboratorsResponse, NotesListItem } from '../../../shared/types';
import { listLabels } from '../../labels/api';
import {
  deleteNote,
  inviteCollaborator,
  listCollaborators,
  listNotes,
  removeCollaborator,
  updateCollaboratorPermission,
} from '../api';

export function NotesPage({ mode = 'personal' }: { mode?: 'personal' | 'shared' }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState<NotesListItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [collabOpen, setCollabOpen] = useState(false);
  const [collabNote, setCollabNote] = useState<NotesListItem | null>(null);
  const [collabData, setCollabData] = useState<NoteCollaboratorsResponse | null>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit'>('view');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [notesData, labelsData] = await Promise.all([listNotes(token), listLabels(token)]);
      setNotes(notesData);
      setLabels(labelsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener('fundoo:notes-refresh', onRefresh);
    return () => window.removeEventListener('fundoo:notes-refresh', onRefresh);
  }, [load]);

  const openCollaborators = useCallback(
    async (note: NotesListItem) => {
      if (!token) return;
      setCollabOpen(true);
      setCollabNote(note);
      setCollabLoading(true);
      setCollabError(null);
      setInviteEmail('');
      setInvitePermission('view');
      try {
        const data = await listCollaborators(token, note.id);
        setCollabData(data);
      } catch (err) {
        setCollabError(err instanceof ApiError ? err.message : 'Failed to load collaborators');
        setCollabData(null);
      } finally {
        setCollabLoading(false);
      }
    },
    [token]
  );

  const reloadCollaborators = useCallback(async () => {
    if (!token || !collabNote) return;
    try {
      const data = await listCollaborators(token, collabNote.id);
      setCollabData(data);
    } catch {
      // keep existing
    }
  }, [token, collabNote]);

  const onInvite = useCallback(async () => {
    if (!token || !collabNote) return;
    setCollabError(null);
    const email = inviteEmail.trim();
    if (!email) {
      setCollabError('Enter collaborator email');
      return;
    }
    try {
      await inviteCollaborator(token, collabNote.id, { email, permission: invitePermission });
      setInviteEmail('');
      await reloadCollaborators();
    } catch (err) {
      setCollabError(err instanceof ApiError ? err.message : 'Failed to invite collaborator');
    }
  }, [token, collabNote, inviteEmail, invitePermission, reloadCollaborators]);

  const onUpdatePermission = useCallback(
    async (collab: NoteCollaborator, permission: 'view' | 'edit') => {
      if (!token || !collabNote) return;
      setCollabError(null);
      try {
        await updateCollaboratorPermission(token, collabNote.id, collab.user.id, permission);
        await reloadCollaborators();
      } catch (err) {
        setCollabError(err instanceof ApiError ? err.message : 'Failed to update permission');
      }
    },
    [token, collabNote, reloadCollaborators]
  );

  const onRemove = useCallback(
    async (collab: NoteCollaborator) => {
      if (!token || !collabNote) return;
      setCollabError(null);
      try {
        await removeCollaborator(token, collabNote.id, collab.user.id);
        await reloadCollaborators();
      } catch (err) {
        setCollabError(err instanceof ApiError ? err.message : 'Failed to remove collaborator');
      }
    },
    [token, collabNote, reloadCollaborators]
  );

  const onDelete = useCallback(
    async (id: string) => {
      if (!token) return;
      setError(null);
      try {
        await deleteNote(token, id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to delete note');
      }
    },
    [token]
  );

  const visibleNotes = useMemo(() => {
    const filtered = mode === 'shared' ? notes.filter((n) => n.access !== 'owner') : notes.filter((n) => n.access === 'owner');
    return filtered;
  }, [notes, mode]);

  const getLabelChips = useCallback((labelNames: string) => {
    const raw = (labelNames || '').trim();
    if (!raw) return [] as string[];
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{mode === 'shared' ? 'Shared Notes' : 'Notes'}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {mode === 'shared' ? 'Notes shared with you.' : 'Your personal notes.'}
          </p>
        </div>

        {mode === 'shared' ? null : (
          <Link
            to="/app/notes/new"
            className="rounded-full px-5 py-2 font-semibold whitespace-nowrap bg-amber-200 hover:bg-amber-300 transition border border-amber-300"
          >
            Create note
          </Link>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
          <span className="font-semibold text-rose-700">Error:</span> <span className="text-slate-800">{error}</span>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Loading…</p>
      ) : visibleNotes.length ? (
        <div className="mt-6">
          <div className="keep-masonry columns-1 sm:columns-2 lg:columns-3">
            {visibleNotes.map((note) => (
              <article key={note.id} className="keep-note bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-full px-3 py-1 text-xs bg-slate-100 border border-slate-200 text-slate-700">
                    Owner: <span className="font-semibold">{note.owner.name}</span>
                  </span>

                  {note.access !== 'owner' ? (
                    <span
                      className={
                        note.access === 'edit'
                          ? 'rounded-full px-3 py-1 text-xs bg-rose-100 border border-rose-200 text-rose-700'
                          : 'rounded-full px-3 py-1 text-xs bg-sky-100 border border-sky-200 text-sky-700'
                      }
                    >
                      {note.access === 'edit' ? 'Can Edit' : 'Can View'}
                    </span>
                  ) : null}
                </div>

                <header>
                  <h3 className="text-base font-semibold leading-5 break-words">{note.title}</h3>
                </header>

                {note.label_names?.trim() ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getLabelChips(note.label_names).map((t) => (
                      <span key={`${note.id}:${t}`} className="rounded-full px-3 py-1 text-xs bg-slate-100 border border-slate-200 text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap break-words">{note.content}</p>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {note.access === 'owner' ? (
                    <>
                      <Link
                        to={`/app/notes/${note.id}/edit`}
                        className="rounded-full px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => void onDelete(note.id)}
                        className="rounded-full px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => void openCollaborators(note)}
                        className="rounded-full px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                      >
                        Collab
                      </button>
                    </>
                  ) : note.access === 'edit' ? (
                    <Link
                      to={`/app/notes/${note.id}/edit`}
                      className="rounded-full px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                    >
                      Edit
                    </Link>
                  ) : (
                    <span className="rounded-full px-4 py-1.5 text-xs bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed">
                      View only
                    </span>
                  )}
                </div>

                {note.collaborators?.length ? (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {note.collaborators.map((sw) => (
                      <span
                        key={`${note.id}:${sw.name}:${sw.permission}`}
                        className="rounded-full px-3 py-1 text-xs bg-white border border-slate-200 text-slate-700"
                      >
                        {sw.name} - {sw.permission === 'edit' ? 'Can Edit' : 'Can View'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{mode === 'shared' ? 'No shared notes' : 'No notes yet'}</h2>
          <p className="text-sm text-slate-600 mt-1">
            {mode === 'shared'
              ? 'Notes shared with you will appear here.'
              : 'Create your first note to see it here.'}
          </p>
          {mode === 'shared' ? null : (
            <Link
              to="/app/notes/new"
              className="inline-block mt-4 rounded-full px-4 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300"
            >
              Create a note
            </Link>
          )}
        </section>
      )}

      {/* Collaborators modal */}
      <div className={collabOpen ? 'fixed inset-0 z-40 flex items-center justify-center' : 'hidden'}>
        <button
          type="button"
          aria-label="Close collaborators"
          onClick={() => setCollabOpen(false)}
          className="absolute inset-0 bg-slate-900/20"
        />
        <div className="relative w-[min(720px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div className="font-semibold">Collaborators</div>
            <button
              type="button"
              onClick={() => setCollabOpen(false)}
              className="rounded-full px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              Close
            </button>
          </div>

          <div className="p-5">
            {collabError ? (
              <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
                <span className="font-semibold text-rose-700">Error:</span>{' '}
                <span className="text-slate-800">{collabError}</span>
              </div>
            ) : null}

            {collabLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : collabData ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{collabData.owner.username}</div>
                      <div className="text-xs text-slate-500">{collabData.owner.email || ''}</div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs bg-emerald-100 border border-emerald-200 text-emerald-700">Owner</span>
                  </div>
                </div>

                {collabNote?.access === 'owner' ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter collaborator email"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <select
                        value={invitePermission}
                        onChange={(e) => setInvitePermission(e.target.value as 'view' | 'edit')}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      >
                        <option value="view">Can view</option>
                        <option value="edit">Can edit</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void onInvite()}
                        className="rounded-lg px-4 py-2 text-sm font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : null}

                {collabData.collaborators.length ? (
                  <div className="space-y-3">
                    {collabData.collaborators.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{c.user.username}</div>
                            <div className="text-xs text-slate-500 truncate">{c.user.email || ''}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={
                                c.status === 'pending'
                                  ? 'rounded-full px-3 py-1 text-xs bg-slate-100 border border-slate-200 text-slate-700'
                                  : 'rounded-full px-3 py-1 text-xs bg-slate-50 border border-slate-200 text-slate-500'
                              }
                            >
                              {c.status}
                            </span>

                            {collabNote?.access === 'owner' ? (
                              <>
                                <select
                                  value={c.permission}
                                  onChange={(e) => void onUpdatePermission(c, e.target.value as 'view' | 'edit')}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                >
                                  <option value="view">Can view</option>
                                  <option value="edit">Can edit</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void onRemove(c)}
                                  className="rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <span
                                className={
                                  c.permission === 'edit'
                                    ? 'rounded-full px-3 py-1 text-xs bg-rose-100 border border-rose-200 text-rose-700'
                                    : 'rounded-full px-3 py-1 text-xs bg-sky-100 border border-sky-200 text-sky-700'
                                }
                              >
                                {c.permission === 'edit' ? 'Can edit' : 'Can view'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No collaborators.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600">No data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
