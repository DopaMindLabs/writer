import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
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
});
