import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../../app/providers/useAuth';
import { ApiError } from '../../../shared/api/ApiError';
import type { Label } from '../../../shared/types';
import { createLabel, listLabels } from '../api';

export function LabelsPage() {
  const { token } = useAuth();
  const [labels, setLabels] = useState<Label[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      setError(null);
      setLoading(true);
      try {
        const data = await listLabels(token);
        if (mounted) setLabels(data);
      } catch (err) {
        if (mounted) setError(err instanceof ApiError ? err.message : 'Failed to load labels');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const onCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      setSaving(true);
      setError(null);
      try {
        const created = await createLabel(token, { title: trimmed });
        setLabels((prev) => [created, ...prev]);
        setTitle('');
        window.dispatchEvent(new Event('fundoo:labels-refresh'));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to create label');
      } finally {
        setSaving(false);
      }
    },
    [token, title]
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Labels</h1>
          <p className="text-sm text-slate-600 mt-1">Create labels and attach them to notes.</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
          <span className="font-semibold text-rose-700">Error:</span> <span className="text-slate-800">{error}</span>
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create label</h2>
          <form onSubmit={onCreate} className="mt-4 flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Label title"
              required
            />
            <button
              disabled={saving}
              className="rounded-full px-5 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300 disabled:opacity-60"
              type="submit"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold">All labels</h2>

          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading…</p>
          ) : labels.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {labels.map((l) => (
                <span
                  key={l.label_id}
                  className="rounded-full px-3 py-1.5 text-sm bg-slate-100 border border-slate-200 text-slate-700"
                >
                  {l.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No labels yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
