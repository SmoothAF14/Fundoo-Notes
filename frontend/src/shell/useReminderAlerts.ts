import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { NotesListItem } from '@/shared/types';

/**
 * Shows a toast when a reminder comes due while the app is open.
 * shortcut: in-app only (no email/push), upgrade to a scheduled Celery task if reminders must reach closed tabs.
 */
export function useReminderAlerts(notes: NotesListItem[]) {
  const navigate = useNavigate();
  const since = useRef(0);
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    since.current = Date.now();
    const check = () => {
      const now = Date.now();
      notesRef.current
        .filter((n) => !n.trashed && n.reminder_at)
        .filter((n) => {
          const due = Date.parse(n.reminder_at!);
          return due > since.current && due <= now;
        })
        .forEach((n) =>
          toast(`Reminder: ${n.title}`, {
            duration: 10_000,
            action: { label: 'Open', onClick: () => navigate(`/reminders?note=${n.id}`) },
          })
        );
      since.current = now;
    };
    const t = window.setInterval(check, 20_000);
    return () => window.clearInterval(t);
  }, [navigate]);
}
