import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { FileRestoreHint } from './FileRestoreHint';

describe('FileRestoreHint', () => {
  it('renders as a static info note pointing file-based restore at import', () => {
    renderWithProviders(<FileRestoreHint />);
    const banner = screen.getByTestId('space-settings-backups-file-restore-hint');
    // role=note, not status: a permanent hint must not occupy a live region
    // or it collides with the restore announcement on the same tab.
    expect(banner).toHaveAttribute('role', 'note');
    expect(banner).toHaveTextContent(/restoring from a downloaded \.zip\?/i);
    expect(banner).toHaveTextContent(/export \/ import/i);
    expect(banner).toHaveTextContent(/comes back as a new space/i);
    expect(banner).toHaveTextContent(/leaving this one untouched/i);
  });
});
