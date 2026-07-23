import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { SyncPhase } from '@/lib/syncProviders/types';

const CASES: { phase: SyncPhase; label: RegExp; klass: string }[] = [
  { phase: SyncPhase.InSync, label: /Up to date/i, klass: 'text-success' },
  { phase: SyncPhase.Pushing, label: /Uploading changes/i, klass: 'text-info' },
  { phase: SyncPhase.Pulling, label: /Downloading changes/i, klass: 'text-info' },
  { phase: SyncPhase.Initial, label: /Starting up/i, klass: 'text-info' },
  { phase: SyncPhase.Offline, label: /Offline/i, klass: 'text-warning' },
  { phase: SyncPhase.Pending, label: /Waiting to sync/i, klass: 'text-warning' },
  { phase: SyncPhase.Error, label: /Sync problem/i, klass: 'text-danger' },
];

describe('CloudSyncStatusRow', () => {
  it.each(CASES)('maps the $phase phase to its glyph kind', ({ phase, label, klass }) => {
    renderWithProviders(<CloudSyncStatusRow phase={phase} />);
    const row = screen.getByTestId('cloud-sync-status');
    expect(row).toHaveTextContent(label);
    expect(row.querySelector(`.${klass}`)).not.toBeNull();
  });

  it('appends the error detail in the error phase', () => {
    renderWithProviders(<CloudSyncStatusRow phase={SyncPhase.Error} message="boom" />);
    expect(screen.getByTestId('cloud-sync-status')).toHaveTextContent(/Sync problem: boom/i);
  });
});
