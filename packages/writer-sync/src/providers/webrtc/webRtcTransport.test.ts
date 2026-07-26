import { describe, expect, it, vi } from 'vitest';
import {
  BUFFER_HIGH_WATER_BYTES,
  FrameTooLargeError,
  MAX_FRAME_BYTES,
  createWebRtcTransport,
  type DataChannelLike,
} from './webRtcTransport';

/** A scriptable stand-in for `RTCDataChannel`, so no WebRTC is involved. */
const fakeChannel = () => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: ArrayBuffer[] = [];
  const channel: DataChannelLike & {
    sent: ArrayBuffer[];
    emit: (type: string, data?: unknown) => void;
    closed: boolean;
  } = {
    readyState: 'open',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    closed: false,
    sent,
    send: (data) => {
      sent.push(data);
      channel.bufferedAmount += data.byteLength;
    },
    close: () => {
      channel.closed = true;
    },
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((l) => l !== listener));
    },
    emit: (type, data) => {
      for (const listener of listeners.get(type) ?? []) {
        listener({ data } as MessageEvent<unknown>);
      }
    },
  };
  return channel;
};

describe('createWebRtcTransport', () => {
  it('does not share a store — a remote peer persists separately', () => {
    // The consumer uses this to decide whether to persist what arrives.
    expect(createWebRtcTransport(fakeChannel()).sharesStore).toBe(false);
  });

  it('sends bytes over the channel', () => {
    const channel = fakeChannel();
    createWebRtcTransport(channel).send(new Uint8Array([1, 2, 3]));
    expect(channel.sent).toHaveLength(1);
    expect(new Uint8Array(channel.sent[0])).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('copies outbound bytes so a caller reusing its buffer cannot corrupt them', () => {
    const channel = fakeChannel();
    const buffer = new Uint8Array([1, 2, 3]);
    createWebRtcTransport(channel).send(buffer);
    buffer[0] = 9;
    expect(new Uint8Array(channel.sent[0])[0]).toBe(1);
  });

  it('refuses a frame beyond the ceiling rather than fragmenting it', () => {
    // The operation protocol chunks attachments itself; an oversized frame here
    // is a caller bug, and splitting would hide it.
    const transport = createWebRtcTransport(fakeChannel());
    expect(() => transport.send(new Uint8Array(MAX_FRAME_BYTES + 1))).toThrow(
      FrameTooLargeError,
    );
  });
});

describe('inbound', () => {
  it('delivers binary messages to subscribers', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const seen: Uint8Array[] = [];
    transport.onMessage((bytes) => seen.push(bytes));
    channel.emit('message', new Uint8Array([7, 8]).buffer);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(new Uint8Array([7, 8]));
  });

  it('accepts a typed-array payload as well as a raw buffer', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const seen: Uint8Array[] = [];
    transport.onMessage((bytes) => seen.push(bytes));
    channel.emit('message', new Uint8Array([5]));
    expect(seen[0]).toEqual(new Uint8Array([5]));
  });

  it('drops a non-binary message rather than guessing an encoding', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const seen: Uint8Array[] = [];
    transport.onMessage((bytes) => seen.push(bytes));
    channel.emit('message', 'a string from a peer that is not speaking this protocol');
    expect(seen).toHaveLength(0);
  });

  it('stops delivering once unsubscribed', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const listener = vi.fn();
    transport.onMessage(listener)();
    channel.emit('message', new Uint8Array([1]).buffer);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('backpressure', () => {
  it('queues instead of writing into a full channel', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
    transport.send(new Uint8Array([1]));
    expect(channel.sent).toHaveLength(0);
  });

  it('drains the queue when the channel reports room, not on a timer', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
    transport.send(new Uint8Array([1]));
    transport.send(new Uint8Array([2]));
    expect(channel.sent).toHaveLength(0);

    channel.bufferedAmount = 0;
    channel.emit('bufferedamountlow');
    expect(channel.sent).toHaveLength(2);
  });

  it('sets a low-water threshold so the channel will tell it when to resume', () => {
    const channel = fakeChannel();
    createWebRtcTransport(channel);
    expect(channel.bufferedAmountLowThreshold).toBeGreaterThan(0);
    expect(channel.bufferedAmountLowThreshold).toBeLessThan(BUFFER_HIGH_WATER_BYTES);
  });
});

describe('close', () => {
  it('closes the channel and detaches its listeners', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const listener = vi.fn();
    transport.onMessage(listener);
    transport.close();
    expect(channel.closed).toBe(true);
    channel.emit('message', new Uint8Array([1]).buffer);
    expect(listener).not.toHaveBeenCalled();
  });

  it('discards anything still queued', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
    transport.send(new Uint8Array([1]));
    transport.close();
    channel.bufferedAmount = 0;
    channel.emit('bufferedamountlow');
    expect(channel.sent).toHaveLength(0);
  });

  it('ignores sends after close rather than throwing at the caller', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    transport.close();
    expect(() => transport.send(new Uint8Array([1]))).not.toThrow();
    expect(channel.sent).toHaveLength(0);
  });

  it('is idempotent', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    transport.close();
    expect(() => transport.close()).not.toThrow();
  });
});
