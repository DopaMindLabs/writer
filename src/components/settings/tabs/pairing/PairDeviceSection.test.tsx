import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairDeviceSection } from './PairDeviceSection';

describe('PairDeviceSection', () => {
  it('offers a way into pairing', () => {
    renderWithProviders(<PairDeviceSection />);

    expect(screen.getByTestId('pair-device-open')).toBeInTheDocument();
  });

  it('mounts no dialog until asked', () => {
    renderWithProviders(<PairDeviceSection />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog on activation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PairDeviceSection />);

    await user.click(screen.getByTestId('pair-device-open'));

    expect(await screen.findByRole('dialog', { name: 'Pair another device' })).toBeInTheDocument();
  });

  it('opens from the keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PairDeviceSection />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Pair another device' })).toBeInTheDocument();
  });
});
