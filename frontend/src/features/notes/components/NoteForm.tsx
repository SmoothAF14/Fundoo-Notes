import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import type { Label } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Button, buttonClass } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';

export type NoteFormValues = { title: string; content: string; labels: number[] };

type NoteFormProps = {
  heading: string;
  backTo: string;
  initial: NoteFormValues;
  labels: Label[];
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: NoteFormValues) => void;
};

/** Editor shared by the create and edit screens. */
export function NoteForm({ heading, backTo, initial, labels, submitLabel, saving, error, onSubmit }: NoteFormProps) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [selected, setSelected] = useState<number[]>(initial.labels);

  const toggle = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <section className="animate-rise mx-auto max-w-3xl">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-subtle hover:text-ink">
        <Icon name="arrowLeft" className="h-4 w-4" /> Back to notes
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">{heading}</h1>

      {error ? <Alert className="mt-5">{error}</Alert> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ title, content, labels: selected });
        }}
        className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card"
      >
        <div className="px-6 pt-6">
          <label htmlFor="note-title" className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Title
          </label>
          <input
            id="note-title"
            className="mt-1 block w-full border-0 bg-transparent p-0 text-2xl font-semibold text-ink placeholder:text-faint focus:outline-none focus:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a title"
            autoFocus
            required
          />
        </div>

        <div className="px-6 pt-5">
          <label htmlFor="note-content" className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Note
          </label>
          <textarea
            id="note-content"
            className="mt-1 block min-h-[240px] w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:outline-none focus:ring-0"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing…"
            required
          />
        </div>

        <fieldset className="border-t border-line px-6 py-5">
          <legend className="sr-only">Labels</legend>
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Labels</p>
          {labels.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {labels.map((l) => {
                const on = selected.includes(l.label_id);
                return (
                  <button
                    key={l.label_id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(l.label_id)}
                    className={[
                      'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      on ? 'border-primary bg-primary-soft text-primary-hover' : 'border-line bg-white text-subtle hover:bg-muted',
                    ].join(' ')}
                  >
                    <Icon name={on ? 'check' : 'tag'} className="h-3.5 w-3.5" />
                    {l.title}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-subtle">
              No labels yet.{' '}
              <Link to="/app/labels" className="font-semibold text-primary hover:text-primary-hover">
                Create one
              </Link>
            </p>
          )}
        </fieldset>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-canvas px-6 py-4">
          <Link to={backTo} className={buttonClass('ghost')}>
            Cancel
          </Link>
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
