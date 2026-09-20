import { describe, expect, it, vi } from 'vitest';
import {
  CATCH_UP_PROTOCOL_VERSION,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
} from '../../operations/catchUpMessage';
import {
  ROOT_TRANSFER_VERSION,
  decodeRootTransferMessage,
  encodeRootTransferMessage,
} from '../../pairing/rootTransferMessage';
import { MAX_HELD_MESSAGES, splitPairingChannel, type DataChannelLike } from './index';

/** A scriptable stand-in for `RTCDataChannel`, so no WebRTC is involved. */
const fakeChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const channel: DataChannelLike & { emit: (type: string, data?: unknown) => void } = {
    label: 'writer-sync-control',
    readyState: 'open',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    send: () => undefined,
    close: () => undefined,
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type, listener) => {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((l) => l !== listener),
      );
    },
    emit: (type, data) => {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener({ data } as MessageEvent<unknown>);
      }
    },
  };
  return channel;
};

/**
 * Encode into this realm's own ArrayBuffer. The encoder's `.buffer` belongs to
 * Node's realm under jsdom and fails the module's `instanceof` check — a real
 * channel would hand over a same-realm buffer, so the test builds one too.
 */
const sameRealm = (encoded: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
};

const rootBytes = (kind: 'holds-root' | 'needs-root' | 'ready'): ArrayBuffer =>
  sameRealm(encodeRootTransferMessage({ v: ROOT_TRANSFER_VERSION, kind }));

const manifestBytes = (): ArrayBuffer =>
  sameRealm(
    encodeCatchUpMessage({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'manifest',
      manifests: [],
    }),
  );

const textBytes = (text: string): ArrayBuffer =>
  sameRealm(new TextEncoder().encode(text));

/** Count what a view delivers, subscribing the way each protocol does. */
const countDeliveries = (view: DataChannelLike) => {
  const received: unknown[] = [];
  const listener = (event: MessageEvent<unknown>): void => {
    received.push(event.data);
  };
  view.addEventListener('message', listener);
  return {
    received,
    detach: () => {
      view.removeEventListener('message', listener);
    },
  };
};

describe('splitPairingChannel', () => {
  it('gives a sync message to catch-up alone', async () => {
    const channel = fakeChannel();
    const { rootTransfer, catchUp } = splitPairingChannel({ channel });
    const toRoot = countDeliveries(rootTransfer);
    const toCatchUp = countDeliveries(catchUp);
    await Promise.resolve();

    channel.emit('message', manifestBytes());

    expect(toCatchUp.received).toHaveLength(1);
    expect(toRoot.received).toHaveLength(0);
  });

  it('gives every key-material message to the root transfer alone', async () => {
    const channel = fakeChannel();
    const { rootTransfer, catchUp } = splitPairingChannel({ channel });
    const toRoot = countDeliveries(rootTransfer);
    const toCatchUp = countDeliveries(catchUp);
    await Promise.resolve();

    channel.emit('message', rootBytes('holds-root'));
    channel.emit('message', rootBytes('needs-root'));
    channel.emit('message', rootBytes('ready'));

    expect(toRoot.received).toHaveLength(3);
    expect(toCatchUp.received).toHaveLength(0);
  });

  it('gives a message belonging to neither protocol to both, to be refused', async () => {
    // Routing must not become a way to make validation quieter. A kind neither
    // protocol knows reaches both decoders, which is where it is refused — and
    // both refusals are what the threat model relies on.
    const channel = fakeChannel();
    const { rootTransfer, catchUp } = splitPairingChannel({ channel });
    const toRoot = countDeliveries(rootTransfer);
    const toCatchUp = countDeliveries(catchUp);
    await Promise.resolve();

    channel.emit('message', textBytes(JSON.stringify({ v: 1, kind: 'send-me-everything' })));
    channel.emit('message', textBytes('not a message at all'));

    expect(toRoot.received).toHaveLength(2);
    expect(toCatchUp.received).toHaveLength(2);
    for (const data of toRoot.received) {
      expect(() => decodeRootTransferMessage(new Uint8Array(data as ArrayBuffer))).toThrow();
    }
    for (const data of toCatchUp.received) {
      expect(() => decodeCatchUpMessage(new Uint8Array(data as ArrayBuffer))).toThrow();
    }
  });

  it('holds a peer that starts syncing before this device has finished with keys', async () => {
    // The bug this exists for. The peer's deadline passed first, so it sent its
    // manifest while this device was still reading for key material. The manifest
    // is sent once and never repeated: refusing it cost the exchange entirely.
    const channel = fakeChannel();
    const { rootTransfer, catchUp } = splitPairingChannel({ channel });
    const toRoot = countDeliveries(rootTransfer);
    await Promise.resolve();

    channel.emit('message', rootBytes('holds-root'));
    channel.emit('message', manifestBytes());
    expect(toRoot.received).toHaveLength(1);

    // Key material settles, and only now does catch-up read the channel.
    toRoot.detach();
    const toCatchUp = countDeliveries(catchUp);
    await Promise.resolve();

    expect(toCatchUp.received).toHaveLength(1);
    expect(decodeCatchUpMessage(new Uint8Array(toCatchUp.received[0] as ArrayBuffer)).kind).toBe(
      'manifest',
    );
  });

  it('keeps a late repeat of a finished handshake off the sync decoder', async () => {
    // The slower device keeps saying `ready` until it hears back. Those repeats
    // used to land on the sync decoder and be reported as failures.
    const channel = fakeChannel();
    const { rootTransfer, catchUp } = splitPairingChannel({ channel });
    const toRoot = countDeliveries(rootTransfer);
    await Promise.resolve();
    toRoot.detach();
    const toCatchUp = countDeliveries(catchUp);
    await Promise.resolve();

    channel.emit('message', rootBytes('ready'));

    expect(toCatchUp.received).toHaveLength(0);
  });

  it('says which protocol was holding too much when a peer floods', async () => {
    const channel = fakeChannel();
    const onOverflow = vi.fn();
    splitPairingChannel({ channel, onOverflow });

    for (let index = 0; index <= MAX_HELD_MESSAGES + 1; index += 1) {
      channel.emit('message', manifestBytes());
    }
    await Promise.resolve();

    expect(onOverflow).toHaveBeenCalledWith('catch-up');
  });
});
