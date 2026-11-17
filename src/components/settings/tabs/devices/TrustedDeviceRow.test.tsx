import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import type { DeviceLinkState } from '@/lib/writerSyncIntegration/peerLinkStatus';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceRow } from './TrustedDeviceRow';

/**
 * One row of the device list. What it owes the reader is which device this is,
 * how long it has been trusted, and whether it can be removed — the list around
 * it decides nothing of that.
 */

const device = (overrides: Partial<TrustedDeviceEntry> = {}): TrustedDeviceEntry => ({
  deviceId: 'peer-1',
  displayName: 'Phone',
  addedAt: 1_700_000_000_000,
  lastSessionAt: 1_700_000_500_000,
  isThisDevice: false,
  isRevoked: false,
  ...overrides,
});

interface RowOptions {
  onRemove?: () => void;
  linkState?: DeviceLinkState;
  onReconnect?: () => void;
}

const renderRow = (entry: TrustedDeviceEntry, options: RowOptions = {}) =>
  renderWithProviders(
    <ul>
      <TrustedDeviceRow
        device={entry}
        onRemove={options.onRemove ?? vi.fn()}
        linkState={options.linkState}
        onReconnect={options.onReconnect}
      />
    </ul>,
  );

describe('TrustedDeviceRow', () => {
  it('names the device and says when it was paired and last connected', () => {
    renderRow(device());

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveTextContent('Phone');
    expect(row).toHaveTextContent(/Paired/i);
    expect(row).toHaveTextContent(/last connected/i);
  });

  it('renders a peer-supplied name as text, never as markup', () => {
    // The name arrives from the peer over the authenticated channel and is
    // presentation only — it decides nothing about which key verifies a frame.
    renderRow(device({ displayName: '<img src=x onerror="alert(1)">' }));

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(row.querySelector('img')).toBeNull();
  });

  it('says so when the device has not connected since it was paired', () => {
    renderRow(device({ lastSessionAt: undefined }));

    expect(screen.getByTestId('trusted-device-peer-1')).toHaveTextContent(
      /not connected since pairing/i,
    );
  });

  it('marks the device being looked at, and offers it no removal', () => {
    renderRow(device({ isThisDevice: true }));

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveAttribute('data-this-device', 'true');
    expect(row).toHaveTextContent(/This device/i);
    expect(screen.queryByTestId('trusted-device-remove-peer-1')).not.toBeInTheDocument();
  });

  it('keeps a removed device readable, with nothing left to remove', () => {
    renderRow(device({ isRevoked: true }));

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveAttribute('data-revoked', 'true');
    expect(row).toHaveTextContent(/Removed/i);
    expect(screen.queryByTestId('trusted-device-remove-peer-1')).not.toBeInTheDocument();
  });

  it('reports removal for the device the row belongs to', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderRow(device({ deviceId: 'peer-2' }), { onRemove });

    await user.click(screen.getByTestId('trusted-device-remove-peer-2'));

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('peer-2');
  });

  it('states where a link stands even when there is none', () => {
    // The resting state after any reload. It is stated plainly rather than
    // warned about, and it still offers the way back.
    renderRow(device(), { onReconnect: vi.fn() });

    expect(screen.getByTestId('device-link-idle')).toHaveTextContent('Not connected');
    expect(screen.getByTestId('trusted-device-reconnect-peer-1')).toBeInTheDocument();
  });

  it('marks a device this page is connected to', () => {
    renderRow(device(), { linkState: 'connected' });

    expect(screen.getByTestId('device-link-connected')).toBeInTheDocument();
    // Nothing to offer: the link is working.
    expect(
      screen.queryByTestId('trusted-device-reconnect-peer-1'),
    ).not.toBeInTheDocument();
  });

  it('offers a way back for a link that dropped, naming the device', async () => {
    const user = userEvent.setup();
    const onReconnect = vi.fn();
    renderRow(device({ displayName: 'Phone' }), {
      linkState: 'dropped',
      onReconnect,
    });

    // Named, because a list of several devices offers several of these and a
    // screen reader would otherwise hear "Reconnect" four times over.
    const action = screen.getByRole('button', { name: 'Reconnect Phone' });
    await user.click(action);

    expect(onReconnect).toHaveBeenCalledOnce();
  });

  it('offers no way back where nothing can provide one', () => {
    renderRow(device(), { linkState: 'dropped' });

    expect(
      screen.queryByTestId('trusted-device-reconnect-peer-1'),
    ).not.toBeInTheDocument();
  });

  it('keeps removal available beside the way back', () => {
    renderRow(device(), { linkState: 'dropped', onReconnect: vi.fn() });

    expect(screen.getByTestId('trusted-device-reconnect-peer-1')).toBeInTheDocument();
    expect(screen.getByTestId('trusted-device-remove-peer-1')).toBeInTheDocument();
  });
});
