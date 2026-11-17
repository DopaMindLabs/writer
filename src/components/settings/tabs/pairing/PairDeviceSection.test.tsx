import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairDeviceSection } from './PairDeviceSection';

describe('PairDeviceSection', () => {
  it('offers a way into pairing', () => {
    renderWithProviders(<PairDeviceSection onPair={vi.fn()} />);

    expect(screen.getByTestId('pair-device-open')).toBeInTheDocument();
  });

  it('asks for the dialog rather than holding one', () => {
    // Ownership sits with the tab: the device list offers to re-pair a dropped
    // device too, and two owners of one dialog would be two dialogs.
    const onPair = vi.fn();
    renderWithProviders(<PairDeviceSection onPair={onPair} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPair).not.toHaveBeenCalled();
  });

  it('reports the request on activation', async () => {
    const user = userEvent.setup();
    const onPair = vi.fn();
    renderWithProviders(<PairDeviceSection onPair={onPair} />);

    await user.click(screen.getByTestId('pair-device-open'));

    expect(onPair).toHaveBeenCalledOnce();
  });

  it('reports it from the keyboard too', async () => {
    const user = userEvent.setup();
    const onPair = vi.fn();
    renderWithProviders(<PairDeviceSection onPair={onPair} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onPair).toHaveBeenCalledOnce();
  });
});
