import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { SpaceSyncResult } from '@/lib/sync/folderSync';
import { SyncResultsTable } from './SyncResultsTable';

const results: SpaceSyncResult[] = [
  { spaceId: 's1', name: 'Novel', ok: true },
  { spaceId: 's2', name: 'Essays', ok: false, error: 'disk full' },
];

describe('SyncResultsTable', () => {
  it('renders nothing when there are no results', () => {
    const { container } = renderWithProviders(<SyncResultsTable results={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a row per space with its outcome', () => {
    renderWithProviders(<SyncResultsTable results={results} />);
    expect(screen.getByText('Novel')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('disk full')).toBeInTheDocument();
    expect(screen.getByTestId('sync-result-s2')).toBeInTheDocument();
  });
});
