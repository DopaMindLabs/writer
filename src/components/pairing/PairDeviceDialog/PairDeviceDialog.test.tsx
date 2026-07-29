import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { asDeviceId } from 'writer-sync/core';
import {
  PairingError,
  PairingErrorCode,
  encodePairingPayload,
  splitIntoQrParts,
  type AuthenticatedPeerParameters,
  type PairingAnswer,
  type PairingOffer,
} from 'writer-sync/pairing';
import type { PairingSignaller } from '@/lib/writerSyncIntegration/createPairingSignaller';
import type { PeerCatchUp } from '@/lib/writerSyncIntegration/peerCatchUp';
import { PeerCatchUpContext } from '@/lib/writerSyncIntegration/peerCatchUpContext';
import { PairDeviceDialog } from './PairDeviceDialog';

/**
 * Pairing as the user meets it: no question about which device goes first.
 *
 * Both devices offer a code, and reading one is what settles the roles — so
 * these exercise the flow by what arrives. A reply means this device was the one
 * read; an offer means it is the one reading; its own code means the camera was
 * pointed at the wrong screen.
 */

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';
const JWK = { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) };
const CODE = '048213';

const LOCAL_DEVICE = 'bG9jYWwtZGV2aWNlLTAw';
const PEER_DEVICE = 'ZGV2aWNlLWlkLTAwMDA';

const offer = (deviceId = PEER_DEVICE): PairingOffer => ({
  v: 1,
  sessionId: SESSION,
  kind: 'offer',
  deviceId,
  identityJwk: JWK,
  ephemeralJwk: JWK,
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n',
  nonce: 'bm9uY2UtMDAwMDAwMDA',
  expiresAt: Date.now() + 120_000,
  signature: 'c2lnbmF0dXJl',
});

const answer = (): PairingAnswer => ({
  ...offer('cGVlci1kZXZpY2UtaWQwMA'),
  kind: 'answer',
  offerHash: 'b2ZmZXItaGFzaC0wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA',
});

const peerParameters = (): AuthenticatedPeerParameters => ({
  deviceId: asDeviceId('cGVlci1kZXZpY2UtaWQwMA'),
  publicIdentityJwk: JWK,
  peerEphemeralPublicJwk: JWK,
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
  openChannel: () => new Promise<never>(() => undefined),
  onAnyChannel: () => () => undefined,
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
    deviceId: asDeviceId(LOCAL_DEVICE),
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
      sessionPrivateKey: () => null,
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

/** The dialog with somewhere to hand a confirmed session — the adoption seam. */
const renderDialogWithCatchUp = (catchUp: PeerCatchUp) =>
  renderWithProviders(
    <PeerCatchUpContext.Provider value={catchUp}>
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => Promise.resolve(readySignaller())}
      />
    </PeerCatchUpContext.Provider>,
  );

/** This device's own code, once the user has chosen to show it. */
const ownCode = () => screen.findByRole('img', { name: 'Pairing code from this device' });

/** Choose "show" on the start screen and wait for the code it reveals. */
const showOwnCode = async (): Promise<HTMLElement> => {
  const user = userEvent.setup();
  await user.click(await screen.findByTestId('pairing-start-show'));
  return ownCode();
};

/**
 * Hand the dialog a peer payload the way a user without a camera would. The
 * scanner is reached from the start screen by default; a device already
 * showing its code goes via its own "scan the reply" action instead.
 */
const pastePayload = async (
  payload: PairingOffer | PairingAnswer,
  from: 'start' | 'showing' = 'showing',
): Promise<void> => {
  const user = userEvent.setup();
  await user.click(
    screen.getByTestId(from === 'start' ? 'pairing-start-scan' : 'pairing-scan-start'),
  );
  const encoded = await encodePairingPayload(payload);
  const [symbol] = splitIntoQrParts({ sessionId: SESSION, text: encoded });
  await user.click(screen.getByLabelText('Or paste the code text'));
  await user.paste(symbol);
  await user.click(screen.getByRole('button', { name: 'Use this code' }));
};

describe('PairDeviceDialog', () => {
  it('opens on the start choice, gathering underneath but showing no code', async () => {
    const createSignaller = vi.fn(() => Promise.resolve(readySignaller()));
    renderWithProviders(
      <PairDeviceDialog open onOpenChange={vi.fn()} createSignaller={createSignaller} />,
    );

    expect(await screen.findByTestId('pairing-start-step')).toBeInTheDocument();
    // The choice is presentational: the exchange gathers from the moment the
    // dialog opens, so the code is ready the instant "show" is chosen.
    expect(createSignaller).toHaveBeenCalled();
    // Neither protocol surface exists yet — no code, no pager, no scanner.
    expect(
      screen.queryByRole('img', { name: 'Pairing code from this device' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('pairing-code-scanner')).not.toBeInTheDocument();
  });

  it('reveals the code when the user chooses to show one', async () => {
    renderDialog();

    expect(await showOwnCode()).toBeInTheDocument();
  });

  it('shows progress while the device gathers', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PairDeviceDialog
        open
        onOpenChange={vi.fn()}
        createSignaller={() => new Promise(() => undefined)}
      />,
    );

    await user.click(await screen.findByTestId('pairing-start-show'));

    expect(screen.getByTestId('pair-device-gathering')).toBeInTheDocument();
  });

  it('keeps the scanner behind an action rather than beside the code', async () => {
    const user = userEvent.setup();
    renderDialog();
    await showOwnCode();

    // Two ways in at once is the confusion this flow exists to remove: with a
    // code and a camera side by side, neither device looks like the one that
    // should be scanning.
    expect(screen.queryByTestId('pairing-code-scanner')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pairing-scan-start'));

    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Pairing code from this device' }),
    ).not.toBeInTheDocument();
  });

  it('returns to the code from the scanner', async () => {
    const user = userEvent.setup();
    renderDialog();
    await showOwnCode();
    await user.click(screen.getByTestId('pairing-scan-start'));

    await user.click(screen.getByTestId('pairing-show-code'));

    expect(await ownCode()).toBeInTheDocument();
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

  it('names an expired code, since its fix is a fresh one', async () => {
    // The paste path through a photo app — photograph, gallery, copy, switch
    // apps, paste — routinely outlives the code it carries.
    renderDialog(
      readySignaller({
        onAcceptAnswer: () =>
          Promise.reject(new PairingError(PairingErrorCode.Expired, 'payload has expired')),
      }),
    );
    await showOwnCode();

    await pastePayload(answer());

    const banner = await screen.findByTestId('pair-device-expired');
    expect(banner).toHaveTextContent('expired');
    expect(screen.queryByTestId('pair-device-failed')).not.toBeInTheDocument();
  });

  it('names a code too large to encode, since retrying cannot shrink it', async () => {
    const signaller = readySignaller();
    signaller.adapter.createOffer = () =>
      Promise.reject(
        new PairingError(PairingErrorCode.OversizedPayload, 'payload needs 9 symbols'),
      );
    renderDialog(signaller);

    const banner = await screen.findByTestId('pair-device-too-large');
    expect(banner).toHaveTextContent('too large');
    // Named is not detailed: the developer-facing reason stays off screen.
    expect(banner).not.toHaveTextContent('9 symbols');
    expect(screen.queryByTestId('pair-device-failed')).not.toBeInTheDocument();
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
    await showOwnCode();

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

describe('PairDeviceDialog, once its code has been read', () => {
  it('shows the verification code when a reply arrives', async () => {
    renderDialog();
    await showOwnCode();

    await pastePayload(answer());

    expect(await screen.findByTestId('pairing-verification-code')).toHaveTextContent(CODE);
  });

  it('does not complete pairing on authentication alone', async () => {
    renderDialog();
    await showOwnCode();

    await pastePayload(answer());
    await screen.findByTestId('pairing-verification-code');

    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();
  });

  it('completes only after the user confirms the codes match', async () => {
    const user = userEvent.setup();
    renderDialog();
    await showOwnCode();
    await pastePayload(answer());
    await screen.findByTestId('pairing-verification-code');

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-complete')).toBeInTheDocument();
  });

  it('reports a failure to authenticate rather than showing a code', async () => {
    renderDialog(readySignaller({ onAcceptAnswer: () => Promise.reject(new Error('bad sig')) }));
    await showOwnCode();

    await pastePayload(answer());

    expect(await screen.findByTestId('pair-device-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-verification-code')).not.toBeInTheDocument();
  });

  it('does not declare devices paired when adoption refuses the identity', async () => {
    // The registry refuses a known device presenting a different key. The
    // dialog must show that refusal — a "Devices paired" it had already
    // declared would be a lie about the one thing it exists to establish.
    // Driven as the answering device, whose fixture holds peer parameters once
    // it has answered — the showing half's fixture never mints them.
    const catchUp: PeerCatchUp = {
      adopt: () =>
        Promise.reject(
          new PairingError(PairingErrorCode.TrustedKeyMismatch, 'stored key differs'),
        ),
      stop: () => undefined,
    };
    const user = userEvent.setup();
    renderDialogWithCatchUp(catchUp);
    await screen.findByTestId('pairing-start-step');
    await pastePayload(offer(), 'start');
    await screen.findByRole('img', { name: 'Reply code from this device' });
    await user.click(screen.getByTestId('pairing-reply-shown'));
    await screen.findByTestId('pairing-verification-code');

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-key-mismatch')).toBeInTheDocument();
    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();
  });
});

describe('PairDeviceDialog, when it is the device that read a code', () => {
  it('answers a scanned offer and hands the reply back', async () => {
    renderDialog();
    await screen.findByTestId('pairing-start-step');

    await pastePayload(offer(), 'start');

    expect(
      await screen.findByRole('img', { name: 'Reply code from this device' }),
    ).toBeInTheDocument();
    // Its own offer goes with the role: a device cannot answer a description it
    // authored, so that code would finish nothing.
    expect(
      screen.queryByRole('img', { name: 'Pairing code from this device' }),
    ).not.toBeInTheDocument();
  });

  it('holds the digits back until the reply has been handed over', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByTestId('pairing-start-step');
    await pastePayload(offer(), 'start');
    await screen.findByRole('img', { name: 'Reply code from this device' });

    // The peer cannot show its digits until it has read this code, so comparing
    // them now would be a comparison with nothing.
    expect(screen.queryByTestId('pairing-verification-code')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pairing-reply-shown'));

    expect(await screen.findByTestId('pairing-verification-code')).toHaveTextContent(CODE);
  });

  it('does not complete until this user confirms too', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByTestId('pairing-start-step');
    await pastePayload(offer(), 'start');
    await user.click(await screen.findByTestId('pairing-reply-shown'));
    await screen.findByTestId('pairing-verification-code');

    expect(screen.queryByTestId('pair-device-complete')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(await screen.findByTestId('pair-device-complete')).toBeInTheDocument();
  });

  it('says so when the camera was pointed at this screen', async () => {
    renderDialog();
    await screen.findByTestId('pairing-start-step');

    // Answering a description this device authored would pair it with itself.
    await pastePayload(offer(LOCAL_DEVICE), 'start');

    expect(await screen.findByTestId('pairing-own-code')).toBeInTheDocument();
    // The scanner stays open: the user has somewhere to go with the right code.
    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
  });
});
