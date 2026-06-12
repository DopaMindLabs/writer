import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { FileRestoreHint } from './FileRestoreHint';

describe('FileRestoreHint', () => {
  it('points file-based restore at import and names the consequence', () => {
    renderWithProviders(<FileRestoreHint />);
    const hint = screen.getByTestId('space-settings-backups-file-restore-hint');
    expect(hint).toHaveTextContent(/export \/ import/i);
    expect(hint).toHaveTextContent(/comes back as a new space/i);
    expect(hint).toHaveTextContent(/leaving this one untouched/i);
  });
});
