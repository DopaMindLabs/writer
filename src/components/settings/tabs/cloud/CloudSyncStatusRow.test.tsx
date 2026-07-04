import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import type { CloudSyncPhase } from '@/lib/cloud/cloudClient';

const CASES: { phase: CloudSyncPhase; label: RegExp; klass: string }[] = [
  { phase: 'in-sync', label: /Up to date/i, klass: 'text-success' },
  { phase: 'pushing', label: /Uploading changes/i, klass: 'text-info' },
  { phase: 'pulling', label: /Downloading changes/i, klass: 'text-info' },
  { phase: 'initial', label: /Starting up/i, klass: 'text-info' },
  { phase: 'offline', label: /Offline/i, klass: 'text-warning' },
  { phase: 'not-in-sync', label: /Waiting to sync/i, klass: 'text-warning' },
  { phase: 'error', label: /Sync problem/i, klass: 'text-danger' },
];

describe('CloudSyncStatusRow', () => {
  it.each(CASES)('maps the $phase phase to its glyph kind', ({ phase, label, klass }) => {
    renderWithProviders(<CloudSyncStatusRow phase={phase} />);
    const row = screen.getByTestId('cloud-sync-status');
    expect(row).toHaveTextContent(label);
    expect(row.querySelector(`.${klass}`)).not.toBeNull();
  });

  it('appends the error detail in the error phase', () => {
    renderWithProviders(<CloudSyncStatusRow phase="error" message="boom" />);
    expect(screen.getByTestId('cloud-sync-status')).toHaveTextContent(/Sync problem: boom/i);
  });
});
