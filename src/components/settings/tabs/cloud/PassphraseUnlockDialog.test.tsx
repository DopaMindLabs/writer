import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { WrongPassphraseError } from '@/lib/cloud/crypto/keys';
import { EscrowMissingError } from '@/lib/cloud/crypto/errors';
import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncProvider } from '@/lib/syncProviders/types';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { WriterSyncProvider } from '@/lib/writerSync/WriterSyncProvider';
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

  it('reports a wrong recovery code distinctly in recovery mode', async () => {
    const onRecover = vi.fn().mockRejectedValue(new WrongPassphraseError());
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={vi.fn()}
        onUnlock={vi.fn()}
        onRecover={onRecover}
      />,
    );
    await userEvent.click(await screen.findByTestId('unlock-use-recovery'));
    await userEvent.type(screen.getByTestId('unlock-input'), 'BAD-CODE');
    await userEvent.click(screen.getByTestId('unlock-submit'));
    expect(await screen.findByTestId('unlock-error')).toHaveTextContent(
      /recovery code doesn't match/i,
    );
    expect(onRecover).toHaveBeenCalledWith('BAD-CODE');
  });

  it('shows a neutral message for an unexpected unlock failure', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new Error('disk on fire'));
    renderWithProviders(
      <PassphraseUnlockDialog
        open
        onOpenChange={noop}
        onUnlocked={vi.fn()}
        onUnlock={onUnlock}
        onRecover={vi.fn()}
      />,
    );
    await userEvent.type(await screen.findByTestId('unlock-input'), 'some-passphrase');
    await userEvent.click(screen.getByTestId('unlock-submit'));
    expect(await screen.findByTestId('unlock-error')).toHaveTextContent(
      /Something went wrong while unlocking/i,
    );
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

  it('unlocks through the provider when nothing is injected', async () => {
    const unlock = vi.fn().mockResolvedValue(undefined);
    const provider: SyncProvider = {
      id: 'test-cloud',
      keyDelivery: {
        setUp: () => Promise.resolve('code'),
        unlock,
        recover: () => Promise.resolve(),
        escrowPresence: {
          subscribe: (next) => {
            next(KeyEscrowPresence.Present);
            return { unsubscribe: () => undefined };
          },
        },
      },
    };
    const onUnlocked = vi.fn();
    renderWithProviders(
      <WriterSyncProvider coordinator={createSyncCoordinator({ providers: [provider] })}>
        <PassphraseUnlockDialog open onOpenChange={noop} onUnlocked={onUnlocked} />
      </WriterSyncProvider>,
    );

    await userEvent.type(await screen.findByTestId('unlock-input'), 'correct horse');
    await userEvent.click(screen.getByTestId('unlock-submit'));

    await waitFor(() => {
      expect(unlock).toHaveBeenCalledWith('correct horse');
    });
    expect(onUnlocked).toHaveBeenCalled();
  });
});
