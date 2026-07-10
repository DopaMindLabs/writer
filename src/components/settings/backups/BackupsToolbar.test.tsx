import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { BackupsToolbar } from './BackupsToolbar';

describe('BackupsToolbar', () => {
  it('snapshots on click and disables the button while busy', () => {
    const onSnapshot = vi.fn();
    const { rerender } = renderWithProviders(
      <BackupsToolbar busy={false} onSnapshot={onSnapshot} />,
    );
    fireEvent.click(screen.getByTestId('space-settings-backups-snapshot'));
    expect(onSnapshot).toHaveBeenCalledOnce();

    rerender(<BackupsToolbar busy onSnapshot={onSnapshot} />);
    expect(
      screen.getByTestId('space-settings-backups-snapshot'),
    ).toBeDisabled();
  });

  describe('snapshot', () => {
    it('should match the snapshot for idle and busy states', () => {
      const { container } = renderWithProviders(
        <div>
          <BackupsToolbar busy={false} onSnapshot={() => undefined} />
          <BackupsToolbar busy onSnapshot={() => undefined} />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
