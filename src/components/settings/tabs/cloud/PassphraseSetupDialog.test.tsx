import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncProvider } from '@/lib/syncProviders/types';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { WriterSyncProvider } from '@/lib/writerSync/WriterSyncProvider';
import { PassphraseSetupDialog } from './PassphraseSetupDialog';

const noop = () => {};

describe('PassphraseSetupDialog', () => {
  it('keeps submit disabled for a short or mismatched passphrase', async () => {
    const onCreate = vi.fn().mockResolvedValue('CODE');
    renderWithProviders(
      <PassphraseSetupDialog open onOpenChange={noop} onRecoveryCode={noop} onCreate={onCreate} />,
    );
    const submit = await screen.findByTestId('passphrase-submit');
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByTestId('passphrase-input'), 'tooshort');
    expect(submit).toBeDisabled();
    expect(screen.getByTestId('passphrase-feedback')).toHaveTextContent(/at least 12/i);

    await userEvent.clear(screen.getByTestId('passphrase-input'));
    await userEvent.type(screen.getByTestId('passphrase-input'), 'longenoughphrase');
    await userEvent.type(screen.getByTestId('passphrase-confirm'), 'different-phrase');
    expect(submit).toBeDisabled();
    expect(screen.getByTestId('passphrase-feedback')).toHaveTextContent(/don't match/i);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('rates a long, varied passphrase as strong and a plain one as weak', async () => {
    renderWithProviders(
      <PassphraseSetupDialog open onOpenChange={noop} onRecoveryCode={noop} onCreate={vi.fn()} />,
    );
    const input = await screen.findByTestId('passphrase-input');

    // 16+ chars with mixed case and a digit → all three strength points.
    await userEvent.type(input, 'Abcdefgh1jklmnop');
    expect(screen.getByTestId('passphrase-feedback')).toHaveTextContent(/Strength: Strong/i);

    // 12 chars, single case, no variety → one point only.
    await userEvent.clear(input);
    await userEvent.type(input, 'aaaaaaaaaaaa');
    expect(screen.getByTestId('passphrase-feedback')).toHaveTextContent(/Strength: Weak/i);
  });

  it('accepts a confirmation that is Unicode-equivalent (NFKC) to the passphrase', async () => {
    // "café…" composed (NFC, é as one code point) in the passphrase versus
    // decomposed (NFD, e + combining acute) in the confirmation: the same
    // visible text, different byte sequences. The crypto canonicalises both to
    // NFKC and would unwrap the same escrow, so the dialog must not reject them
    // as a mismatch — and must hand the crypto the canonical value.
    const onCreate = vi.fn().mockResolvedValue('CODE-NFKC');
    renderWithProviders(
      <PassphraseSetupDialog open onOpenChange={noop} onRecoveryCode={noop} onCreate={onCreate} />,
    );
    const composed = 'cafélongphrase'; // NFC
    const decomposed = 'cafélongphrase'; // NFD, same glyphs
    await userEvent.type(await screen.findByTestId('passphrase-input'), composed);
    await userEvent.type(screen.getByTestId('passphrase-confirm'), decomposed);

    const submit = screen.getByTestId('passphrase-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    expect(screen.getByTestId('passphrase-feedback')).not.toHaveTextContent(/don't match/i);

    await userEvent.click(submit);
    await waitFor(() => {
      // The canonical (NFKC) passphrase reaches the crypto, not the raw keystrokes.
      expect(onCreate).toHaveBeenCalledWith(composed.normalize('NFKC'));
    });
  });

  it('creates encryption and hands up the recovery code when valid', async () => {
    const onCreate = vi.fn().mockResolvedValue('CODE-1234');
    const onRecoveryCode = vi.fn();
    renderWithProviders(
      <PassphraseSetupDialog
        open
        onOpenChange={noop}
        onRecoveryCode={onRecoveryCode}
        onCreate={onCreate}
      />,
    );
    await userEvent.type(await screen.findByTestId('passphrase-input'), 'longenoughphrase');
    await userEvent.type(screen.getByTestId('passphrase-confirm'), 'longenoughphrase');
    await userEvent.click(screen.getByTestId('passphrase-submit'));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('longenoughphrase');
    });
    await waitFor(() => {
      expect(onRecoveryCode).toHaveBeenCalledWith('CODE-1234');
    });
  });

  it('sets up through the provider when nothing is injected', async () => {
    const setUp = vi.fn().mockResolvedValue('PROVIDER-CODE');
    const provider: SyncProvider = {
      id: 'test-cloud',
      kind: 'dexie-cloud',
      keyDelivery: {
        setUp,
        unlock: () => Promise.resolve(),
        recover: () => Promise.resolve(),
        escrowPresence: {
          subscribe: (next) => {
            next(KeyEscrowPresence.Present);
            return { unsubscribe: () => undefined };
          },
        },
      },
    };
    const onRecoveryCode = vi.fn();
    renderWithProviders(
      <WriterSyncProvider
        coordinator={createSyncCoordinator({
          providers: [provider],
          defaultProviderInstanceId: 'test-cloud',
        })}
      >
        <PassphraseSetupDialog open onOpenChange={noop} onRecoveryCode={onRecoveryCode} />
      </WriterSyncProvider>,
    );

    await userEvent.type(screen.getByTestId('passphrase-input'), 'longenoughphrase');
    await userEvent.type(screen.getByTestId('passphrase-confirm'), 'longenoughphrase');
    await userEvent.click(await screen.findByTestId('passphrase-submit'));

    await waitFor(() => {
      expect(setUp).toHaveBeenCalledWith('longenoughphrase');
    });
    expect(onRecoveryCode).toHaveBeenCalledWith('PROVIDER-CODE');
  });
});
