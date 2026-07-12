import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudSectionDialogs, type CloudSectionDialogsProps } from './CloudSectionDialogs';

const baseProps = (
  overrides: Partial<CloudSectionDialogsProps> = {},
): CloudSectionDialogsProps => ({
  dialog: 'none',
  setDialog: vi.fn(),
  recoveryCode: null,
  setRecoveryCode: vi.fn(),
  onKeyAcquired: vi.fn(),
  interaction: null,
  ...overrides,
});

describe('CloudSectionDialogs', () => {
  it('renders no dialog in the idle state', () => {
    renderWithProviders(<CloudSectionDialogs {...baseProps()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the passphrase setup dialog when dialog is "setup"', async () => {
    renderWithProviders(<CloudSectionDialogs {...baseProps({ dialog: 'setup' })} />);
    expect(await screen.findByTestId('passphrase-input')).toBeInTheDocument();
  });

  it('opens the unlock dialog when dialog is "unlock"', async () => {
    renderWithProviders(<CloudSectionDialogs {...baseProps({ dialog: 'unlock' })} />);
    expect(await screen.findByTestId('passphrase-unlock-dialog')).toBeInTheDocument();
  });

  it('routes a setup-dialog close back through setDialog as "none"', async () => {
    const setDialog = vi.fn();
    renderWithProviders(<CloudSectionDialogs {...baseProps({ dialog: 'setup', setDialog })} />);
    await screen.findByTestId('passphrase-input');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(setDialog).toHaveBeenCalledWith('none');
    });
  });

  it('routes an unlock-dialog close back through setDialog as "none"', async () => {
    const setDialog = vi.fn();
    renderWithProviders(<CloudSectionDialogs {...baseProps({ dialog: 'unlock', setDialog })} />);
    await screen.findByTestId('passphrase-unlock-dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(setDialog).toHaveBeenCalledWith('none');
    });
  });

  it('shows the recovery code and clears it once acknowledged', async () => {
    const setRecoveryCode = vi.fn();
    renderWithProviders(
      <CloudSectionDialogs
        {...baseProps({ recoveryCode: 'WORD-CODE-1234', setRecoveryCode })}
      />,
    );
    expect(await screen.findByTestId('recovery-code')).toHaveTextContent('WORD-CODE-1234');

    await userEvent.click(screen.getByTestId('recovery-confirm'));
    await userEvent.click(screen.getByTestId('recovery-done'));
    expect(setRecoveryCode).toHaveBeenCalledWith(null);
  });
});
