import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import type { PairingOffer } from 'writer-sync/pairing';
import { PairDeviceDialog } from './PairDeviceDialog';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const offer = (): PairingOffer => ({
  v: 1,
  sessionId: SESSION,
  kind: 'offer',
  deviceId: 'ZGV2aWNlLWlkLTAwMDA',
  identityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  ephemeralJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n',
  nonce: 'bm9uY2UtMDAwMDAwMDA',
  expiresAt: Date.now() + 120_000,
  signature: 'c2lnbmF0dXJl',
});

/** A signaller that resolves immediately, and records whether it was closed. */
const readySignaller = (): PairingSignaller & { closed: () => boolean } => {
  let closed = false;
  return {
    sessionId: SESSION,
    adapter: {
      createOffer: () => Promise.resolve(offer()),
      acceptOffer: () => Promise.reject(new Error('not used')),
      acceptAnswer: () => Promise.reject(new Error('not used')),
      parameters: () => null,
    },
    close: () => {
      closed = true;
    },
    closed: () => closed,
  };
};

describe('PairDeviceDialog', () => {
  it('shows progress while the device gathers', () => {
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => new Promise(() => undefined)}
      />,
    );

    expect(screen.getByTestId('pair-device-gathering')).toBeInTheDocument();
  });

  it('shows the pairing code once gathering completes', async () => {
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => Promise.resolve(readySignaller())}
      />,
    );

    expect(
      await screen.findByRole('img', { name: 'Pairing code from this device' }),
    ).toBeInTheDocument();
  });

  it('reports a failure without putting the underlying reason on screen', async () => {
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => Promise.reject(new Error('ICE gathering stalled'))}
      />,
    );

    const banner = await screen.findByTestId('pair-device-failed');
    expect(banner).toBeInTheDocument();
    expect(banner).not.toHaveTextContent('ICE gathering stalled');
  });

  it('names the dialog and describes what to do', () => {
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => new Promise(() => undefined)}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Pair another device' })).toBeInTheDocument();
  });

  it('gathers nothing while closed', () => {
    const createSignaller = vi.fn(() => Promise.resolve(readySignaller()));

    renderWithProviders(
      <PairDeviceDialog open={false} onOpenChange={vi.fn()} createSignaller={createSignaller} />,
    );

    expect(createSignaller).not.toHaveBeenCalled();
  });

  it('closes the connection when the dialog is dismissed', async () => {
    const signaller = readySignaller();
    const { rerender } = renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => Promise.resolve(signaller)}
      />,
    );
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    rerender(
      <PairDeviceDialog
        open={false}
        onOpenChange={vi.fn()}
        createSignaller={() => Promise.resolve(signaller)}
      />,
    );

    await waitFor(() => {
      expect(signaller.closed()).toBe(true);
    });
  });
});
