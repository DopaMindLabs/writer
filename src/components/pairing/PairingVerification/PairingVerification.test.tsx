import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingVerification } from './PairingVerification';

describe('PairingVerification', () => {
  it('shows the six digits both devices derived', () => {
    renderWithProviders(<PairingVerification code="048213" onConfirm={vi.fn()} />);

    expect(screen.getByTestId('pairing-verification-code')).toHaveTextContent('048213');
  });

  it('names the code for a screen reader', () => {
    renderWithProviders(<PairingVerification code="048213" onConfirm={vi.fn()} />);

    expect(screen.getByLabelText('Verification code')).toBeInTheDocument();
  });

  it('offers no way to type a code in', () => {
    // A field to type the code into is a field an attacker can ask a user to
    // fill. The code is compared by eye, never entered.
    renderWithProviders(<PairingVerification code="048213" onConfirm={vi.fn()} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('confirms only when the user says so', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(<PairingVerification code="048213" onConfirm={onConfirm} />);

    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('confirms from the keyboard', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(<PairingVerification code="048213" onConfirm={onConfirm} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('says what to do when the codes differ', () => {
    renderWithProviders(<PairingVerification code="048213" onConfirm={vi.fn()} />);

    expect(
      screen.getByText('If they differ, close this and start again.'),
    ).toBeInTheDocument();
  });
});
