import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { useAppDispatch, useAppSelector } from '../../../app/store';
import { fetchLabels } from '../../../app/store/labelsSlice';
import { ApiError } from '../../../shared/api/ApiError';
import { createNote } from '../api';
import { NoteForm, type NoteFormValues } from '../components/NoteForm';

const EMPTY: NoteFormValues = { title: '', content: '', labels: [] };

export function NoteCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const labels = useAppSelector((s) => s.labels.items);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) dispatch(fetchLabels(token));
  }, [token, dispatch]);

  const onSubmit = useCallback(
    async (values: NoteFormValues) => {
      if (!token) return;
      setSaving(true);
      setError(null);
      try {
        await createNote(token, { ...values, archived: false });
        navigate('/app/notes', { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to create note');
      } finally {
        setSaving(false);
      }
    },
    [token, navigate]
  );

  return (
    <NoteForm
      heading="New note"
      backTo="/app/notes"
      initial={EMPTY}
      labels={labels}
      submitLabel={saving ? 'Saving…' : 'Save note'}
      saving={saving}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
