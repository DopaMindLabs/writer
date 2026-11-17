import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import {
  ephemeralPublicJwkOf,
  generatePairingEphemeral,
  type PairingEphemeralKeys,
} from 'writer-sync/crypto';
import {
  PairingErrorCode,
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  type AuthenticatedPeerParameters,
  type RootTransferMessage,
} from 'writer-sync/pairing';
import type { DataChannelLike } from 'writer-sync/providers/webrtc';
import { appLogger } from '@/lib/appLogger';
import { deviceKeyVault } from '@/lib/cloud/crypto/deviceKeyVault';
import {
  deviceKeyProvider,
  forgetDeviceKeyRing,
  saveDeviceKeyRing,
} from '@/lib/cloud/crypto/keyStore';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { currentPrincipal } from './writerEntityMetadata';
import {
  TRANSFER_DEADLINE_MILLIS,
  rootSecretHandoverPorts,
  runRootSecretHandover,
} from './rootSecretHandover';

/**
 * Writer's half of the root-secret handover, against real Web Crypto.
 *
 * What matters here is that a device which receives a root ends up exactly where
 * one that unlocked by passphrase does — same vault, same ring — and that a
 * wrapper only opens for the session it was sealed in.
 */

const EPOCH = 4;
const HERE = asDeviceId('this-device');
/**
 * The window a pairing session runs in. Read once from the real clock, because
 * the cases that do not inject one are checked against the ambient reading.
 */
const EXPIRES_AT = Date.now() + 300_000;

let ephemeral: PairingEphemeralKeys;
let root: Uint8Array;

const peerFor = async (
  transcript: Uint8Array,
  expiresAt = EXPIRES_AT,
): Promise<AuthenticatedPeerParameters> => ({
  deviceId: asDeviceId('peer-device'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  peerEphemeralPublicJwk: await ephemeralPublicJwkOf(ephemeral.publicKey),
  transcript,
  verificationCode: '048213',
  expiresAt,
});

beforeEach(async () => {
  ephemeral = await generatePairingEphemeral();
  root = generateRootSecret();
  await deviceKeyVault.storeRootSecret(root, await currentPrincipal());
  await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(root, EPOCH) });
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await deviceKeyVault.forget();
});

describe('rootSecretHandoverPorts', () => {
  it('holds a root exactly when this device can seal a row', async () => {
    const transcript = new Uint8Array([1, 2, 3, 4]);
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    expect(ports.holdsRoot()).toBe(true);

    await forgetDeviceKeyRing();

    // Stored bytes are not the question — whether a row can be sealed right now
    // is, and that is what the peer is being told.
    expect(ports.holdsRoot()).toBe(false);
  });

  it('seals the root at the epoch its ring derives with', async () => {
    const transcript = new Uint8Array([1, 2, 3, 4]);
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    const sealed = await ports.wrapForPeer();

    // Guessing the epoch on the far side would derive a key that decrypts
    // nothing, which reads as a peer with no writing rather than as a fault.
    expect(sealed.epoch).toBe(EPOCH);
    expect(sealed.wrapper.wrapped.length).toBeGreaterThan(0);
  });

  it('installs a root it receives, leaving the device able to seal', async () => {
    const transcript = new Uint8Array([9, 9, 9]);
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });
    const sealed = await ports.wrapForPeer();
    await forgetDeviceKeyRing();
    await deviceKeyVault.forget();

    await ports.acceptWrapper(sealed);

    expect(deviceKeyProvider.hasAnyKey()).toBe(true);
    expect(deviceKeyProvider.current()?.epoch).toBe(EPOCH);
    expect(await deviceKeyVault.hasRootSecret()).toBe(true);
  });

  it('mints the root secret when this device is the one to do it', async () => {
    // Two devices that have never been used: one has to mint, and the ids they
    // exchanged decide which without another round trip.
    await forgetDeviceKeyRing();
    await deviceKeyVault.forget();
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([7])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    expect(ports.holdsRoot()).toBe(false);

    await ports.createRoot();

    expect(ports.holdsRoot()).toBe(true);
    expect(await deviceKeyVault.hasRootSecret()).toBe(true);
  });

  it('defers to the peer that sorts above it', async () => {
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([7])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: asDeviceId('aaa-below-the-peer'),
    });

    // The peer's id is 'peer-device'; this one sorts below it, so the peer mints.
    expect(ports.mintsFirst()).toBe(false);
  });

  it('refuses a wrapper sealed in a different session', async () => {
    const sealed = await rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([1, 1, 1])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    }).wrapForPeer();

    // The key and the AAD are both bound to the transcript, so a wrapper lifted
    // from another exchange simply fails to open.
    const elsewhere = rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([2, 2, 2])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });

    await expect(elsewhere.acceptWrapper(sealed)).rejects.toThrow();
  });

  it('seals the root while the pairing session is still live', async () => {
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([1, 2])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
      now: () => EXPIRES_AT - 1,
    });

    await expect(ports.wrapForPeer()).resolves.toMatchObject({ epoch: EPOCH });
  });

  it('refuses to seal the root at the moment the session expires', async () => {
    const wrap = vi.spyOn(deviceKeyVault, 'wrapRootSecretForPairing');
    try {
      const ports = rootSecretHandoverPorts({
        peer: await peerFor(new Uint8Array([1, 2])),
        sessionPrivateKey: ephemeral.privateKey,
        deviceId: HERE,
        // Expiry is absolute: the boundary itself is already too late.
        now: () => EXPIRES_AT,
      });

      await expect(ports.wrapForPeer()).rejects.toMatchObject({
        code: PairingErrorCode.Expired,
      });
      expect(wrap).not.toHaveBeenCalled();
    } finally {
      wrap.mockRestore();
    }
  });

  it('refuses a session confirmed after the code it was read from expired', async () => {
    const wrap = vi.spyOn(deviceKeyVault, 'wrapRootSecretForPairing');
    try {
      let reading = EXPIRES_AT - 60_000;
      const ports = rootSecretHandoverPorts({
        peer: await peerFor(new Uint8Array([1, 2])),
        sessionPrivateKey: ephemeral.privateKey,
        deviceId: HERE,
        now: () => reading,
      });
      // Authenticated and connected well within the window; the human compared
      // the codes long after it closed.
      expect(ports.holdsRoot()).toBe(true);
      reading = EXPIRES_AT + 1;

      await expect(ports.wrapForPeer()).rejects.toMatchObject({
        code: PairingErrorCode.Expired,
      });
      expect(wrap).not.toHaveBeenCalled();
    } finally {
      wrap.mockRestore();
    }
  });

  it('lets go of the ephemeral key once the session has expired', async () => {
    const sealed = await rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([1, 2])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
      now: () => EXPIRES_AT - 1,
    }).wrapForPeer();
    let reading = EXPIRES_AT - 1;
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(new Uint8Array([1, 2])),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
      now: () => reading,
    });

    reading = EXPIRES_AT;
    await expect(ports.wrapForPeer()).rejects.toMatchObject({
      code: PairingErrorCode.Expired,
    });

    // The key the wrapper would open with is gone, so a root arriving late
    // cannot be installed either.
    await expect(ports.acceptWrapper(sealed)).rejects.toThrow();
  });

  it('refuses to open anything when this session minted no ephemeral key', async () => {
    const transcript = new Uint8Array([5, 5]);
    const ports = rootSecretHandoverPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: ephemeral.privateKey,
      deviceId: HERE,
    });
    const sealed = await ports.wrapForPeer();

    const keyless = rootSecretHandoverPorts({
      peer: await peerFor(transcript),
      sessionPrivateKey: null,
      deviceId: HERE,
    });

    await expect(keyless.acceptWrapper(sealed)).rejects.toThrow();
  });
});

/**
 * One end of a message channel, with the other end held by the test.
 *
 * Mirrors `peerCatchUp.test.ts`: listeners are recorded so the test can act as
 * the peer, and everything sent is decoded so assertions read protocol
 * messages rather than bytes.
 */
const fakeChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: RootTransferMessage[] = [];
  return {
    sent,
    listenerCount: () => (listeners.get('message') ?? []).length,
    /** Deliver as the peer would: bytes on the wire. */
    deliver: (data: unknown) => {
      for (const listener of listeners.get('message') ?? []) {
        listener({ data } as MessageEvent<unknown>);
      }
    },
    channel: {
      label: 'writer-sync-control',
      readyState: 'open',
      bufferedAmount: 0,
      bufferedAmountLowThreshold: 0,
      send: (data: ArrayBuffer) => {
        sent.push(decodeRootTransferMessage(new Uint8Array(data)));
      },
      close: vi.fn(),
      addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), listener]);
      },
      removeEventListener: (
        type: string,
        listener: (event: MessageEvent<unknown>) => void,
      ) => {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((held) => held !== listener),
        );
      },
    } as unknown as DataChannelLike,
  };
};

/**
 * Encode into this realm's own ArrayBuffer. The encoder's `.buffer` belongs to
 * Node's realm under jsdom and fails the module's `instanceof` check — a real
 * channel would hand over a same-realm buffer, so the test builds one too.
 */
const bytesOf = (message: RootTransferMessage): ArrayBuffer => {
  const encoded = encodeRootTransferMessage(message);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
};

describe('runRootSecretHandover', () => {
  it('settles once both peers are ready, and leaves the channel to the next protocol', async () => {
    // This device holds a root (beforeEach); a peer that also holds one means
    // nothing moves — the conversation is two announcements and two readies.
    const wire = fakeChannel();
    const onCompleted = vi.fn();
    runRootSecretHandover({
      channel: wire.channel,
      session: {
        peer: await peerFor(new Uint8Array([3, 3])),
        sessionPrivateKey: ephemeral.privateKey,
        deviceId: HERE,
      },
      onCompleted,
      onAborted: vi.fn(),
    });

    expect(wire.sent.some((message) => message.kind === 'holds-root')).toBe(true);

    wire.deliver(bytesOf({ v: 1, kind: 'holds-root' }));
    wire.deliver(bytesOf({ v: 1, kind: 'ready' }));

    await vi.waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
    // Catch-up reads this channel next with a decoder of its own; a listener
    // left behind would report every sync message as an unreadable transfer.
    expect(wire.listenerCount()).toBe(0);
  });

  it('takes bytes however the browser delivers them', async () => {
    const wire = fakeChannel();
    const onCompleted = vi.fn();
    runRootSecretHandover({
      channel: wire.channel,
      session: {
        peer: await peerFor(new Uint8Array([4, 4])),
        sessionPrivateKey: ephemeral.privateKey,
        deviceId: HERE,
      },
      onCompleted,
      onAborted: vi.fn(),
    });

    // A channel delivers ArrayBuffer, a typed-array view, or text, depending
    // on the browser and the sender; all three carry the same message.
    wire.deliver(bytesOf({ v: 1, kind: 'holds-root' }));
    wire.deliver(new DataView(bytesOf({ v: 1, kind: 'ready' })));
    wire.deliver(JSON.stringify({ v: 1, kind: 'ready' }));

    await vi.waitFor(() => {
      expect(onCompleted).toHaveBeenCalledTimes(1);
    });
  });

  it('refuses a message that is not this protocol without dying', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    try {
      const wire = fakeChannel();
      const onCompleted = vi.fn();
      runRootSecretHandover({
        channel: wire.channel,
        session: {
          peer: await peerFor(new Uint8Array([5, 5])),
          sessionPrivateKey: ephemeral.privateKey,
          deviceId: HERE,
        },
        onCompleted,
      onAborted: vi.fn(),
      });

      wire.deliver(42); // not bytes at all
      wire.deliver(bytesOf({ v: 1, kind: 'holds-root' }));
      wire.deliver(bytesOf({ v: 1, kind: 'ready' }));

      await vi.waitFor(() => {
        expect(onCompleted).toHaveBeenCalledTimes(1);
      });
      expect(warn).toHaveBeenCalledWith(
        'refused a message during root secret transfer',
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('sends no root for a session that expired before the peer asked', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const wrap = vi.spyOn(deviceKeyVault, 'wrapRootSecretForPairing');
    try {
      const wire = fakeChannel();
      const onCompleted = vi.fn();
      const onAborted = vi.fn();
      runRootSecretHandover({
        channel: wire.channel,
        session: {
          peer: await peerFor(new Uint8Array([8, 8])),
          sessionPrivateKey: ephemeral.privateKey,
          deviceId: HERE,
        },
        now: () => EXPIRES_AT + 1,
        onCompleted,
        onAborted,
      });

      wire.deliver(bytesOf({ v: 1, kind: 'needs-root' }));

      // The peer asked and this device holds one — but the window it was
      // authenticated in has closed, so nothing is sealed and nothing is sent.
      await vi.waitFor(() => {
        expect(onAborted).toHaveBeenCalledWith({ status: 'expired' });
      });
      // Expiry is terminal, not a completion: syncing on would present a
      // pairing that transferred nothing as one that worked.
      expect(onCompleted).not.toHaveBeenCalled();
      expect(wrap).not.toHaveBeenCalled();
      expect(wire.sent.some((message) => message.kind === 'root')).toBe(false);
      expect(wire.listenerCount()).toBe(0);
    } finally {
      wrap.mockRestore();
      warn.mockRestore();
    }
  });

  it('gives up at the deadline when the peer never speaks, exactly once', async () => {
    vi.useFakeTimers();
    try {
      const wire = fakeChannel();
      const onCompleted = vi.fn();
      const onAborted = vi.fn();
      const running = runRootSecretHandover({
        channel: wire.channel,
        session: {
          peer: await peerFor(new Uint8Array([6, 6])),
          sessionPrivateKey: ephemeral.privateKey,
          deviceId: HERE,
        },
        onCompleted,
        onAborted,
      });

      expect(onAborted).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(TRANSFER_DEADLINE_MILLIS);

      // A peer that never spoke agreed nothing. This once reported a
      // settlement, and a caller that commits on one would have vouched for a
      // device on the strength of ten seconds of silence.
      expect(onAborted).toHaveBeenCalledWith({ status: 'timed-out' });
      expect(onCompleted).not.toHaveBeenCalled();
      expect(wire.listenerCount()).toBe(0);

      // Reporting twice would hand the channel over twice.
      running.stop();
      expect(onAborted).toHaveBeenCalledTimes(1);
      expect(onCompleted).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports being stopped as a cancellation, never as a completion', async () => {
    const wire = fakeChannel();
    const onCompleted = vi.fn();
    const onAborted = vi.fn();
    const running = runRootSecretHandover({
      channel: wire.channel,
      session: {
        peer: await peerFor(new Uint8Array([7, 7])),
        sessionPrivateKey: ephemeral.privateKey,
        deviceId: HERE,
      },
      onCompleted,
      onAborted,
    });

    running.stop();

    expect(onAborted).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(onCompleted).not.toHaveBeenCalled();
    expect(wire.listenerCount()).toBe(0);
  });

  it('reports a failure that is not expiry as a failure', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    const wrap = vi
      .spyOn(deviceKeyVault, 'wrapRootSecretForPairing')
      .mockRejectedValue(new Error('the vault could not seal the root'));
    try {
      const wire = fakeChannel();
      const onCompleted = vi.fn();
      const onAborted = vi.fn();
      runRootSecretHandover({
        channel: wire.channel,
        session: {
          peer: await peerFor(new Uint8Array([9, 9])),
          sessionPrivateKey: ephemeral.privateKey,
          deviceId: HERE,
        },
        onCompleted,
        onAborted,
      });

      // The peer asks, this device holds one, and sealing it fails for a reason
      // that has nothing to do with the clock.
      wire.deliver(bytesOf({ v: 1, kind: 'needs-root' }));

      await vi.waitFor(() => {
        expect(onAborted).toHaveBeenCalledTimes(1);
      });
      expect(onAborted.mock.calls[0]?.[0]).toMatchObject({ status: 'failed' });
      expect(onCompleted).not.toHaveBeenCalled();
      expect(wire.listenerCount()).toBe(0);
    } finally {
      wrap.mockRestore();
      warn.mockRestore();
    }
  });
});
