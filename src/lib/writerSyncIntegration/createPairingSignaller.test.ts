import { describe, expect, it, vi } from 'vitest';
import { SESSION_TTL_MILLIS } from 'writer-sync/pairing';
import type { PeerConnectionLike } from 'writer-sync/providers/webrtc';
import { createPairingSignaller } from './createPairingSignaller';

const OFFER_SDP = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=candidate:offer\r\n';

/**
 * A connection that gathers immediately. The engine's own tests cover gathering
 * and its timeout; what matters here is that the wiring reaches a real payload.
 */
const fakeConnection = (): PeerConnectionLike & { closed: () => boolean } => {
  let closed = false;
  const description = { type: 'offer', sdp: OFFER_SDP };
  return {
    iceGatheringState: 'complete',
    connectionState: 'new',
    localDescription: description,
    createDataChannel: () => ({
      readyState: 'open',
      bufferedAmount: 0,
      bufferedAmountLowThreshold: 0,
      send: () => undefined,
      close: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
    onDataChannel: () => () => undefined,
    createOffer: () => Promise.resolve(description),
    createAnswer: () => Promise.resolve({ type: 'answer', sdp: OFFER_SDP }),
    setLocalDescription: () => Promise.resolve(),
    setRemoteDescription: () => Promise.resolve(),
    close: () => {
      closed = true;
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    closed: () => closed,
  };
};

describe('createPairingSignaller', () => {
  it('mints a session id per exchange', async () => {
    const first = await createPairingSignaller({ createConnection: fakeConnection });
    const second = await createPairingSignaller({ createConnection: fakeConnection });

    expect(first.sessionId).not.toBe(second.sessionId);
    expect(first.sessionId.length).toBeGreaterThan(0);
  });

  it('produces a signed offer carrying the gathered description', async () => {
    const signaller = await createPairingSignaller({ createConnection: fakeConnection });

    const offer = await signaller.adapter.createOffer({
      sessionId: signaller.sessionId,
      expiresAt: Date.now() + SESSION_TTL_MILLIS,
    });

    expect(offer.kind).toBe('offer');
    expect(offer.sdp).toBe(OFFER_SDP);
    expect(offer.signature.length).toBeGreaterThan(0);
    expect(offer.sessionId).toBe(signaller.sessionId);
  });

  it('signs with this device rather than a fresh identity each time', async () => {
    const first = await createPairingSignaller({ createConnection: fakeConnection });
    const second = await createPairingSignaller({ createConnection: fakeConnection });

    const one = await first.adapter.createOffer({
      sessionId: first.sessionId,
      expiresAt: Date.now() + SESSION_TTL_MILLIS,
    });
    const two = await second.adapter.createOffer({
      sessionId: second.sessionId,
      expiresAt: Date.now() + SESSION_TTL_MILLIS,
    });

    expect(two.deviceId).toBe(one.deviceId);
  });

  it('shares one replay cache across exchanges', async () => {
    const first = await createPairingSignaller({ createConnection: fakeConnection });
    const second = await createPairingSignaller({ createConnection: fakeConnection });
    const offer = await first.adapter.createOffer({
      sessionId: first.sessionId,
      expiresAt: Date.now() + SESSION_TTL_MILLIS,
    });

    // A photographed code replayed into a second, freshly opened exchange must
    // still be recognised — that is what a device-local cache is for.
    await second.adapter.acceptOffer(offer);

    await expect(second.adapter.acceptOffer(offer)).rejects.toMatchObject({
      code: 'replayed-nonce',
    });
  });

  it('closes the underlying connection', async () => {
    const connection = fakeConnection();
    const signaller = await createPairingSignaller({ createConnection: () => connection });

    signaller.close();

    expect(connection.closed()).toBe(true);
  });

  it('uses the browser connection when none is injected', async () => {
    const construct = vi.fn();
    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        constructor(configuration: RTCConfiguration) {
          construct(configuration);
        }
        addEventListener = () => undefined;
        removeEventListener = () => undefined;
        close = () => undefined;
      },
    );

    await createPairingSignaller();

    expect(construct).toHaveBeenCalledWith({ iceServers: [] });
    vi.unstubAllGlobals();
  });
});
