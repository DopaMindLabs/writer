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

interface SignallerScript {
  onAcceptAnswer?: () => Promise<AuthenticatedPeerParameters>;
  onAcceptOffer?: () => Promise<PairingAnswer>;
}

/** A peer session that never opens a channel; nothing here drives sync. */
const idlePeerSession = () => ({
  channel: () => null,
  onChannel: () => () => undefined,
  createOffer: () => Promise.resolve(''),
  acceptOffer: () => Promise.resolve(''),
  acceptAnswer: () => Promise.resolve(),
  close: () => undefined,
});

const readySignaller = (script: SignallerScript = {}): FakeSignaller => {
  let closed = false;
  let answered = false;
  return {
    sessionId: SESSION,
    session: idlePeerSession(),
    adapter: {
      createOffer: () => Promise.resolve(offer()),
      acceptOffer: async () => {
        const minted = await (script.onAcceptOffer ?? (() => Promise.resolve(answer())))();
        answered = true;
        return minted;
      },
      acceptAnswer: script.onAcceptAnswer ?? (() => Promise.resolve(peerParameters())),
      // The joiner learns the parameters by answering, not by being told.
      parameters: () => (answered ? peerParameters() : null),
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

/** Choose which half of the exchange this device runs. */
const choose = async (which: 'show' | 'read'): Promise<void> => {
  const user = userEvent.setup();
  await user.click(screen.getByTestId(`pairing-role-${which}`));
};

/** Hand the dialog a peer payload through the camera-free paste path. */
const pastePayload = async (payload: PairingOffer | PairingAnswer): Promise<void> => {
  const user = userEvent.setup();
  const encoded = await encodePairingPayload(payload);
  const [symbol] = splitIntoQrParts({ sessionId: SESSION, text: encoded });
  await user.click(screen.getByLabelText('Or paste the code text'));
  await user.paste(symbol);
  await user.click(screen.getByRole('button', { name: 'Use this code' }));
};

describe('PairDeviceDialog', () => {
  it('asks which half of the exchange this device runs before gathering', () => {
    const createSignaller = vi.fn(() => Promise.resolve(readySignaller()));
    renderWithProviders(
      <PairDeviceDialog open onOpenChange={vi.fn()} createSignaller={createSignaller} />,
    );

    expect(screen.getByTestId('pairing-role-choice')).toBeInTheDocument();
    expect(createSignaller).not.toHaveBeenCalled();
  });

  it('shows progress while the device gathers', async () => {
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => new Promise(() => undefined)}
      />,
    );

    await choose('show');

    expect(screen.getByTestId('pair-device-gathering')).toBeInTheDocument();
  });

  it('shows the pairing code once gathering completes', async () => {
    renderDialog();
    await choose('show');

    expect(
      await screen.findByRole('img', { name: 'Pairing code from this device' }),
    ).toBeInTheDocument();
  });

  it('offers a way to read the reply back at the same time', async () => {
    renderDialog();
    await choose('show');
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

    await choose('show');

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
    await choose('show');
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
    await choose('show');
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pastePayload(answer());

    expect(await screen.findByTestId('pairing-verification-code')).toHaveTextContent(CODE);
  });

  it('does not complete pairing on authentication alone', async () => {
    renderDialog();
    await choose('show');
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pastePayload(answer());
    await screen.findByTestId('pairing-verification-code');

    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();
  });

  it('completes only after the user confirms the codes match', async () => {
    const user = userEvent.setup();
    renderDialog();
    await choose('show');
    await screen.findByRole('img', { name: 'Pairing code from this device' });
    await pastePayload(answer());
    await screen.findByTestId('pairing-verification-code');

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-complete')).toBeInTheDocument();
  });

  it('reports a failure to authenticate rather than showing a code', async () => {
    renderDialog(readySignaller({ onAcceptAnswer: () => Promise.reject(new Error('bad sig')) }));
    await choose('show');
    await screen.findByRole('img', { name: 'Pairing code from this device' });

    await pastePayload(answer());

    expect(await screen.findByTestId('pair-device-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-verification-code')).not.toBeInTheDocument();
  });
});

describe('PairDeviceDialog, reading the other device', () => {
  it('asks for the peer code first, with nothing of its own to show', async () => {
    renderDialog();

    await choose('read');

    expect(await screen.findByTestId('pairing-code-scanner')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the reply for the peer to read once the offer is answered', async () => {
    renderDialog();
    await choose('read');
    await screen.findByTestId('pairing-code-scanner');

    await pastePayload(offer());

    expect(
      await screen.findByRole('img', { name: 'Reply code from this device' }),
    ).toBeInTheDocument();
  });

  it('reaches the same gate, showing the code the peer must match', async () => {
    renderDialog();
    await choose('read');
    await screen.findByTestId('pairing-code-scanner');

    await pastePayload(offer());

    expect(await screen.findByTestId('pairing-verification-code')).toHaveTextContent(CODE);
    // The reply stays on screen: the peer cannot show its digits until it has
    // read this code.
    expect(screen.getByRole('img', { name: 'Reply code from this device' })).toBeInTheDocument();
  });

  it('does not complete until this user confirms too', async () => {
    const user = userEvent.setup();
    renderDialog();
    await choose('read');
    await screen.findByTestId('pairing-code-scanner');
    await pastePayload(offer());
    await screen.findByTestId('pairing-verification-code');

    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-complete')).toBeInTheDocument();
  });

  it('refuses a payload that is not an offer', async () => {
    // A reply pasted into the reading device is a mistake, not an exchange.
    renderDialog();
    await choose('read');
    await screen.findByTestId('pairing-code-scanner');

    await pastePayload(answer());

    expect(await screen.findByTestId('pair-device-failed')).toBeInTheDocument();
  });

  it('reports a refused offer without echoing the reason', async () => {
    renderDialog(readySignaller({ onAcceptOffer: () => Promise.reject(new Error('replayed')) }));
    await choose('read');
    await screen.findByTestId('pairing-code-scanner');

    await pastePayload(offer());

    const banner = await screen.findByTestId('pair-device-failed');
    expect(banner).not.toHaveTextContent('replayed');
  });
});
