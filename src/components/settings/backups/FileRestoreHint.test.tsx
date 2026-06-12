import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { FileRestoreHint } from './FileRestoreHint';

describe('FileRestoreHint', () => {
  it('renders as an info notice pointing file-based restore at import', () => {
    renderWithProviders(<FileRestoreHint />);
    const banner = screen.getByTestId('space-settings-backups-file-restore-hint');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveTextContent(/restoring from a downloaded \.zip\?/i);
    expect(banner).toHaveTextContent(/export \/ import/i);
    expect(banner).toHaveTextContent(/comes back as a new space/i);
    expect(banner).toHaveTextContent(/leaving this one untouched/i);
  });
});
