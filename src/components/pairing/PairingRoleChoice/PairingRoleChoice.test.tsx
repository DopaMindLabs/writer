import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingRoleChoice } from './PairingRoleChoice';

describe('PairingRoleChoice', () => {
  it('offers both halves of the exchange as named actions', () => {
    renderWithProviders(<PairingRoleChoice onChoose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Show a code on this device' })).toBeEnabled();
    expect(screen.getByRole('button', { name: "Read the other device's code" })).toBeEnabled();
  });

  it('chooses the showing half', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    renderWithProviders(<PairingRoleChoice onChoose={onChoose} />);

    await user.click(screen.getByTestId('pairing-role-show'));

    expect(onChoose).toHaveBeenCalledWith('initiator');
  });

  it('chooses the reading half', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    renderWithProviders(<PairingRoleChoice onChoose={onChoose} />);

    await user.click(screen.getByTestId('pairing-role-read'));

    expect(onChoose).toHaveBeenCalledWith('joiner');
  });

  it('says which device each choice belongs on', () => {
    // The two devices cannot coordinate before pairing, so the copy has to.
    renderWithProviders(<PairingRoleChoice onChoose={vi.fn()} />);

    expect(screen.getByText(/Choose this on one device/)).toBeInTheDocument();
    expect(screen.getByText(/Choose this on the second device/)).toBeInTheDocument();
  });
});
