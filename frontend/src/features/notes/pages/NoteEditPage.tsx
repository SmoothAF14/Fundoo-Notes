import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchLabels } from '../../../app/store/labelsSlice';
import { ApiError } from '../../../shared/api/ApiError';
import type { Note } from '../../../shared/types';
import { getNote, updateNote } from '../api';

export function NoteEditPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();

  const labels = useAppSelector((s) => s.labels.items);

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        const n = await getNote(token, id);
        if (!mounted) return;
        setNote(n);
        setTitle(n.title);
        setContent(n.content);
        setSelectedLabels(n.labels);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load note');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, id]);

  useEffect(() => {
    if (token && labels.length === 0) {
      dispatch(fetchLabels(token));
    }
  }, [token, labels.length, dispatch]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token || !id) return;
      setSaving(true);
      setError(null);
      try {
        await updateNote(token, id, {
          title,
          content,
          labels: selectedLabels,
          archived: note?.archived ?? false,
        });
        navigate('/app/notes', { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to update note');
      } finally {
        setSaving(false);
      }
    },
    [token, id, title, content, selectedLabels, note?.archived, navigate]
  );

  if (!id) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">Missing note id.</div>
    );
  }

  return (
    <section className="max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Update Note</h1>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading…</p> : null}

        {error ? (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
            <span className="font-semibold text-rose-700">Error:</span> <span className="text-slate-800">{error}</span>
          </div>
        ) : null}

        {!loading && note ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Labels</label>
              <select
                multiple
                value={selectedLabels.map(String)}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions)
                    .map((o) => Number(o.value))
                    .filter((n) => Number.isFinite(n));
                  setSelectedLabels(values);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {labels.map((l) => (
                  <option key={l.label_id} value={String(l.label_id)}>
                    {l.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Hold Ctrl to select multiple.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Content</label>
              <textarea
                className="mt-1 w-full min-h-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Link className="text-sm text-slate-600 hover:text-slate-900" to="/app/notes">
                Back
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full px-5 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300 disabled:opacity-60"
              >
                {saving ? 'Updating…' : 'Update'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
