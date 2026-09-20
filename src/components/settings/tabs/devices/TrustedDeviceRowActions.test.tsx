import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceRowActions } from './TrustedDeviceRowActions';

const device = (overrides: Partial<TrustedDeviceEntry> = {}): TrustedDeviceEntry => ({
  deviceId: 'peer-1',
  displayName: 'Phone',
  addedAt: 1_700_000_000_000,
  lastSessionAt: 1_700_000_500_000,
  isThisDevice: false,
  isRevoked: false,
  ...overrides,
});

describe('TrustedDeviceRowActions', () => {
  it('offers removal, whatever the link is doing', () => {
    renderWithProviders(
      <TrustedDeviceRowActions device={device()} onRemove={vi.fn()} />,
    );

    expect(screen.getByTestId('trusted-device-remove-peer-1')).toBeInTheDocument();
  });

  it('names the device it removes', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(
      <TrustedDeviceRowActions device={device({ deviceId: 'peer-2' })} onRemove={onRemove} />,
    );

    await user.click(screen.getByTestId('trusted-device-remove-peer-2'));

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('peer-2');
  });

  it('offers a way back whenever nothing is carrying', () => {
    const { rerender } = renderWithProviders(
      <TrustedDeviceRowActions
        device={device()}
        onRemove={vi.fn()}
        linkState="connected"
        onReconnect={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId('trusted-device-reconnect-peer-1'),
    ).not.toBeInTheDocument();

    rerender(
      <TrustedDeviceRowActions
        device={device()}
        onRemove={vi.fn()}
        linkState="dropped"
        onReconnect={vi.fn()}
      />,
    );
    expect(screen.getByTestId('trusted-device-reconnect-peer-1')).toBeInTheDocument();

    // A page that never reached the device needs exactly the same thing.
    rerender(
      <TrustedDeviceRowActions
        device={device()}
        onRemove={vi.fn()}
        onReconnect={vi.fn()}
      />,
    );

    expect(screen.getByTestId('trusted-device-reconnect-peer-1')).toBeInTheDocument();
  });

  it('says which device it would reconnect', () => {
    // Several rows carry this action; the label is the only thing telling them
    // apart to anyone not looking at the screen.
    renderWithProviders(
      <TrustedDeviceRowActions
        device={device({ displayName: 'Studio iMac' })}
        onRemove={vi.fn()}
        linkState="dropped"
        onReconnect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Reconnect Studio iMac' }),
    ).toBeInTheDocument();
  });

  it('starts the exchange when asked', async () => {
    const user = userEvent.setup();
    const onReconnect = vi.fn();
    renderWithProviders(
      <TrustedDeviceRowActions
        device={device()}
        onRemove={vi.fn()}
        linkState="dropped"
        onReconnect={onReconnect}
      />,
    );

    await user.click(screen.getByTestId('trusted-device-reconnect-peer-1'));

    expect(onReconnect).toHaveBeenCalledOnce();
  });

  it('says what it reconnects when the device has sent no name yet', () => {
    // A freshly paired device has no name until it sends one, and a label
    // reading "Reconnect " with nothing after it says less than nothing.
    renderWithProviders(
      <TrustedDeviceRowActions
        device={device({ displayName: '' })}
        onRemove={vi.fn()}
        linkState="dropped"
        onReconnect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Reconnect this paired device' }),
    ).toBeInTheDocument();
  });
});
