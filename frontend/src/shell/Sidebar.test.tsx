import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { makeLabel, renderWithProviders, storeState } from '@/test-utils';

import { Sidebar } from './Sidebar';

function Where() {
  const { pathname } = useLocation();
  return <output data-testid="path">{pathname}</output>;
}

function renderSidebar(route = '/notes', props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const onEditLabels = vi.fn();
  renderWithProviders(
    <>
      <Sidebar onEditLabels={onEditLabels} {...props} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { route, state: storeState({ labels: [makeLabel(1, 'Home'), makeLabel(2, 'Work stuff')] }) }
  );
  return { onEditLabels };
}

describe('Sidebar', () => {
  it('lists every section and the user’s labels', () => {
    renderSidebar();
    for (const name of ['Notes', 'Reminders', 'Shared with me', 'Archive', 'Trash', 'Home', 'Work stuff']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Work stuff' })).toHaveAttribute('href', '/label/Work%20stuff');
  });

  it('marks the current section as the active page', () => {
    renderSidebar('/archive');
    expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Notes' })).not.toHaveAttribute('aria-current');
  });

  it('navigates when a section is clicked and reports it to close the mobile sheet', () => {
    const onNavigate = vi.fn();
    renderSidebar('/notes', { onNavigate });
    fireEvent.click(screen.getByRole('link', { name: 'Trash' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/trash');
    expect(onNavigate).toHaveBeenCalled();
  });

  it('opens the label editor', () => {
    const { onEditLabels } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Edit labels' }));
    expect(onEditLabels).toHaveBeenCalled();
  });

  it('collapsed mode keeps every item reachable by an accessible name', () => {
    renderSidebar('/notes', { collapsed: true });
    expect(screen.getByRole('link', { name: 'Reminders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit labels' })).toBeInTheDocument();
  });
});
