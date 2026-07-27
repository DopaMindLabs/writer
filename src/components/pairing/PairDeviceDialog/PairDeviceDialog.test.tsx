import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { asDeviceId } from 'writer-sync/core';
import {
  encodePairingPayload,
  splitIntoQrParts,
  type AuthenticatedPeerParameters,
  type PairingAnswer,
  type PairingOffer,
} from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import { PairDeviceDialog } from './PairDeviceDialog';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';
const JWK = { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) };
const CODE = '048213';

const offer = (): PairingOffer => ({
  v: 1,
  sessionId: SESSION,
  kind: 'offer',
  deviceId: 'ZGV2aWNlLWlkLTAwMDA',
  identityJwk: JWK,
  ephemeralJwk: JWK,
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n',
  nonce: 'bm9uY2UtMDAwMDAwMDA',
  expiresAt: Date.now() + 120_000,
  signature: 'c2lnbmF0dXJl',
});

const answer = (): PairingAnswer => ({
  ...offer(),
  kind: 'answer',
  deviceId: 'cGVlci1kZXZpY2UtaWQwMA',
  offerHash: 'b2ZmZXItaGFzaC0wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA',
});

const peerParameters = (): AuthenticatedPeerParameters => ({
  deviceId: asDeviceId('cGVlci1kZXZpY2UtaWQwMA'),
  publicIdentityJwk: JWK,
  transcript: new Uint8Array([1, 2, 3]),
  verificationCode: CODE,
});

interface FakeSignaller extends PairingSignaller {
  closed: () => boolean;
}

const readySignaller = (
  onAcceptAnswer: () => Promise<AuthenticatedPeerParameters> = () =>
    Promise.resolve(peerParameters()),
): FakeSignaller => {
  let closed = false;
  return {
    sessionId: SESSION,
    adapter: {
      createOffer: () => Promise.resolve(offer()),
      acceptOffer: () => Promise.reject(new Error('not used')),
      acceptAnswer: onAcceptAnswer,
      parameters: () => null,
    },
    close: () => {
      closed = true;
    },
    closed: () => closed,
  };
};

const renderDialog = (signaller: PairingSignaller = readySignaller()) =>
  renderWithProviders(
    <PairDeviceDialog
      open
      onOpenChange={vi.fn()}
      createSignaller={() => Promise.resolve(signaller)}
    />,
  );

/** Hand the dialog the peer's answer through the camera-free paste path. */
const pasteAnswer = async (): Promise<void> => {
  const user = userEvent.setup();
  const encoded = await encodePairingPayload(answer());
  const [symbol] = splitIntoQrParts({ sessionId: SESSION, text: encoded });
  await user.click(screen.getByLabelText('Or paste the code text'));
  await user.paste(symbol);
  await user.click(screen.getByRole('button', { name: 'Use this code' }));
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
    renderDialog();

    expect(
      await screen.findByRole('img', { name: 'Pairing code from this device' }),
    ).toBeInTheDocument();
  });

  it('offers a way to read the reply back at the same time', async () => {
    renderDialog();
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
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
    const { rerender } = renderDialog(signaller);
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

  it('shows the verification code once the answer authenticates', async () => {
    renderDialog();
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pasteAnswer();

    expect(await screen.findByTestId('pairing-verification-code')).toHaveTextContent(CODE);
  });

  it('does not complete pairing on authentication alone', async () => {
    renderDialog();
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pasteAnswer();
    await screen.findByTestId('pairing-verification-code');

    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();
  });

  it('completes only after the user confirms the codes match', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('img', { name: 'Pairing code from this device' });
    await pasteAnswer();
    await screen.findByTestId('pairing-verification-code');

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-complete')).toBeInTheDocument();
  });

  it('reports a failure to authenticate rather than showing a code', async () => {
    renderDialog(readySignaller(() => Promise.reject(new Error('bad signature'))));
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pasteAnswer();

    expect(await screen.findByTestId('pair-device-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-verification-code')).not.toBeInTheDocument();
  });
});
