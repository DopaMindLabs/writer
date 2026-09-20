import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingStartStep } from './PairingStartStep';

/**
 * The first screen exists to sequence two people around two devices, so what
 * matters is that it offers the two halves as a choice and shows neither.
 */

describe('PairingStartStep', () => {
  it('offers both halves of the exchange as named actions', () => {
    renderWithProviders(<PairingStartStep onShow={vi.fn()} onScan={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Show a code to start pairing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Scan the code on your other device' }),
    ).toBeInTheDocument();
  });

  it('shows neither a code nor a scanner', () => {
    renderWithProviders(<PairingStartStep onShow={vi.fn()} onScan={vi.fn()} />);

    // The pager belongs to a code that has been asked for; at rest there is no
    // code, so "Symbol 1 of 2" has nothing to leak from.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pairing-code-scanner')).not.toBeInTheDocument();
  });

  it('reports which half the user chose', async () => {
    const user = userEvent.setup();
    const onShow = vi.fn();
    const onScan = vi.fn();
    renderWithProviders(<PairingStartStep onShow={onShow} onScan={onScan} />);

    await user.click(screen.getByTestId('pairing-start-show'));
    expect(onShow).toHaveBeenCalledOnce();

    await user.click(screen.getByTestId('pairing-start-scan'));
    expect(onScan).toHaveBeenCalledOnce();
  });
});
