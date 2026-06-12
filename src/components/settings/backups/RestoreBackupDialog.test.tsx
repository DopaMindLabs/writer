import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { RestoreBackupDialog } from './RestoreBackupDialog';

describe('RestoreBackupDialog', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(
      <RestoreBackupDialog
        open={false}
        busy={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains the replace-with-snapshot behaviour and confirms', () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <RestoreBackupDialog
        open
        busy={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/restore this snapshot\?/i);
    expect(dialog).toHaveTextContent(/saved first/i);
    fireEvent.click(screen.getByTestId('restore-backup-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels via the cancel button', () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <RestoreBackupDialog
        open
        busy={false}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('restore-backup-dialog-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables both actions and shows progress while busy', () => {
    renderWithProviders(
      <RestoreBackupDialog
        open
        busy
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId('restore-backup-dialog-confirm')).toBeDisabled();
    expect(screen.getByTestId('restore-backup-dialog-cancel')).toBeDisabled();
    expect(screen.getByTestId('restore-backup-dialog-confirm')).toHaveTextContent(
      /restoring/i,
    );
  });
});
