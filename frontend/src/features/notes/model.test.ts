import { describe, expect, it } from 'vitest';

import { makeLabel, makeNote } from '@/test-utils';

import { isOverdue, noteLabelTitles, notesForView, toLocalInputValue } from './model';

const labels = [makeLabel(1, 'Work'), makeLabel(2, 'Home')];
const notes = [
  makeNote({ id: 'active', title: 'Active', labels: [1] }),
  makeNote({ id: 'archived', title: 'Archived', archived: true }),
  makeNote({ id: 'trashed', title: 'Trashed', trashed: true, labels: [1] }),
  makeNote({ id: 'reminder', title: 'Later', reminder_at: '2030-01-02T09:00:00Z' }),
  makeNote({ id: 'early', title: 'Earlier', reminder_at: '2030-01-01T09:00:00Z' }),
  makeNote({ id: 'shared', title: 'From bob', access: 'view', owner: { name: 'bob', email: '' }, label_names: 'Team, Q3' }),
];
const ids = (list: { id: string }[]) => list.map((n) => n.id);

describe('notesForView', () => {
  it('Notes shows own notes that are neither archived nor trashed', () => {
    expect(ids(notesForView(notes, 'notes', labels))).toEqual(['active', 'reminder', 'early']);
  });
  it('Archive and Trash show only their own notes', () => {
    expect(ids(notesForView(notes, 'archive', labels))).toEqual(['archived']);
    expect(ids(notesForView(notes, 'trash', labels))).toEqual(['trashed']);
  });
  it('Reminders are sorted soonest first and exclude trash', () => {
    expect(ids(notesForView(notes, 'reminders', labels))).toEqual(['early', 'reminder']);
  });
  it('Shared shows notes owned by others', () => {
    expect(ids(notesForView(notes, 'shared', labels))).toEqual(['shared']);
  });
  it('a label view matches case-insensitively and skips trashed notes', () => {
    expect(ids(notesForView(notes, 'label', labels, { labelName: 'work' }))).toEqual(['active']);
  });
  it('search matches titles, content and label names, never trash, and needs a query', () => {
    expect(ids(notesForView(notes, 'search', labels, { query: 'q3' }))).toEqual(['shared']);
    expect(ids(notesForView(notes, 'search', labels, { query: 'WORK' }))).toEqual(['active']);
    expect(notesForView(notes, 'search', labels, { query: '  ' })).toEqual([]);
  });
});

describe('noteLabelTitles', () => {
  it('resolves an owner’s label ids against live labels (so renames show at once)', () => {
    expect(noteLabelTitles(makeNote({ labels: [2, 1, 99] }), labels)).toEqual(['Home', 'Work']);
  });
  it('uses server-provided names for notes shared by others', () => {
    expect(noteLabelTitles(notes[5], labels)).toEqual(['Team', 'Q3']);
  });
});

describe('reminder helpers', () => {
  it('isOverdue compares against now', () => {
    expect(isOverdue('2000-01-01T00:00:00Z')).toBe(true);
    expect(isOverdue('2999-01-01T00:00:00Z')).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });
  it('toLocalInputValue round-trips through a datetime-local input', () => {
    const iso = new Date(2030, 0, 2, 9, 5).toISOString();
    expect(toLocalInputValue(iso)).toBe('2030-01-02T09:05');
    expect(toLocalInputValue(null)).toBe('');
  });
});
