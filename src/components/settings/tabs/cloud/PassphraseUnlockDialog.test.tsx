import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { WrongPassphraseError } from '@/lib/cloud/crypto/keys';
import { EscrowMissingError } from '@/lib/cloud/crypto/errors';
import { PassphraseUnlockDialog } from './PassphraseUnlockDialog';

const noop = () => {};

describe('PassphraseUnlockDialog', () => {
  it('shows an inline error and stays keyless on a wrong passphrase', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new WrongPassphraseError());
    const onUnlocked = vi.fn();
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={onUnlocked}
        onUnlock={onUnlock}
        onRecover={vi.fn()}
      />,
    );
    await userEvent.type(await screen.findByTestId('unlock-input'), 'wrong-passphrase');
    await userEvent.click(screen.getByTestId('unlock-submit'));
    expect(await screen.findByTestId('unlock-error')).toHaveTextContent(/doesn't match/i);
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('tells a missing escrow apart from a wrong passphrase (sign in first)', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new EscrowMissingError());
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={vi.fn()}
        onUnlock={onUnlock}
        onRecover={vi.fn()}
      />,
    );
    await userEvent.type(await screen.findByTestId('unlock-input'), 'account-passphrase');
    await userEvent.click(screen.getByTestId('unlock-submit'));
    expect(await screen.findByTestId('unlock-error')).toHaveTextContent(/sign in first/i);
  });

  it('unlocks with the right passphrase', async () => {
    const onUnlock = vi.fn().mockResolvedValue(undefined);
    const onUnlocked = vi.fn();
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={onUnlocked}
        onUnlock={onUnlock}
        onRecover={vi.fn()}
      />,
    );
    await userEvent.type(await screen.findByTestId('unlock-input'), 'right-passphrase');
    await userEvent.click(screen.getByTestId('unlock-submit'));
    await waitFor(() => {
      expect(onUnlocked).toHaveBeenCalledTimes(1);
    });
  });

  it('switches to recovery-code entry', async () => {
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={noop}
        onUnlock={vi.fn()}
        onRecover={vi.fn()}
      />,
    );
    await userEvent.click(await screen.findByTestId('unlock-use-recovery'));
    expect(screen.getByTestId('unlock-submit')).toHaveTextContent(/Recover/i);
    expect(screen.getByTestId('unlock-input')).toHaveAccessibleName(/Recovery code/i);
  });
});
