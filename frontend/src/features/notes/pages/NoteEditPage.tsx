import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchLabels } from '../../../app/store/labelsSlice';
import { ApiError } from '../../../shared/api/ApiError';
import type { Note } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Spinner } from '../../../shared/ui/Button';
import { getNote, updateNote } from '../api';
import { NoteForm, type NoteFormValues } from '../components/NoteForm';

export function NoteEditPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const labels = useAppSelector((s) => s.labels.items);

  const [note, setNote] = useState<Note | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Shared notes live under "Shared with me", so return there after editing one.
  const backTo = note && note.access !== 'owner' ? '/app/shared' : '/app/notes';

  useEffect(() => {
    let mounted = true;
    if (!token || !id) return;
    setLoadError(null);
    getNote(token, id)
      .then((n) => mounted && setNote(n))
      .catch((err) => mounted && setLoadError(err instanceof ApiError ? err.message : 'Failed to load note'));
    return () => {
      mounted = false;
    };
  }, [token, id]);

  useEffect(() => {
    if (token) dispatch(fetchLabels(token));
  }, [token, dispatch]);

  const onSubmit = useCallback(
    async (values: NoteFormValues) => {
      if (!token || !id) return;
      setSaving(true);
      setError(null);
      try {
        await updateNote(token, id, { ...values, archived: note?.archived ?? false });
        navigate(backTo, { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to update note');
      } finally {
        setSaving(false);
      }
    },
    [token, id, note?.archived, backTo, navigate]
  );

  if (loadError) return <Alert className="mx-auto max-w-3xl">{loadError}</Alert>;

  if (!note) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-subtle">
        <Spinner /> Loading note…
      </div>
    );
  }

  return (
    <NoteForm
      heading="Edit note"
      backTo={backTo}
      initial={{ title: note.title, content: note.content, labels: note.labels }}
      labels={labels}
      submitLabel={saving ? 'Saving…' : 'Save changes'}
      saving={saving}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
