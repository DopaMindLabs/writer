import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { SyncEntry } from '@/db/schema';
import { SyncHistoryTable } from './SyncHistoryTable';

const entries: SyncEntry[] = [
  {
    id: 'ok1',
    spaceId: 's1',
    when: Date.now(),
    kind: 'manual',
    status: 'ok',
    size: 2048,
  },
  {
    id: 'err1',
    spaceId: 's2',
    when: Date.now(),
    kind: 'auto',
    status: 'error',
    size: 0,
    error: 'disk full',
  },
];

describe('SyncHistoryTable', () => {
  it('shows an empty state when there are no entries', () => {
    renderWithProviders(<SyncHistoryTable entries={[]} />);
    expect(screen.getByText(/no syncs yet/i)).toBeInTheDocument();
  });

  it('renders rows with space names, size, and status', () => {
    renderWithProviders(
      <SyncHistoryTable
        entries={entries}
        showSpace
        spaceNames={{ s1: 'Novel', s2: 'Essays' }}
      />,
    );
    expect(screen.getByText('Novel')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('2.0 kB')).toBeInTheDocument();
    expect(screen.getByText('disk full')).toBeInTheDocument();
  });

  it('renders without a Space column when showSpace is false', () => {
    renderWithProviders(<SyncHistoryTable entries={entries} />);
    expect(screen.getByTestId('sync-history')).toBeInTheDocument();
    expect(screen.queryByText('Novel')).not.toBeInTheDocument();
  });

  it('falls back to the spaceId when no display name is mapped', () => {
    renderWithProviders(
      <SyncHistoryTable
        entries={entries}
        showSpace
        spaceNames={{ s1: 'Novel' }}
      />,
    );
    // s2 has no mapped name, so its raw id is shown.
    expect(screen.getByText('s2')).toBeInTheDocument();
  });
});
