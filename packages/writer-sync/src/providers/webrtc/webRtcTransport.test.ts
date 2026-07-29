import { describe, expect, it, vi } from 'vitest';
import {
  BUFFER_HIGH_WATER_BYTES,
  FrameTooLargeError,
  MAX_FRAME_BYTES,
  createWebRtcTransport,
  type DataChannelLike,
} from './webRtcTransport';

/**
 * A scriptable stand-in for `RTCDataChannel`, so no WebRTC is involved.
 *
 * `send` throws off an open channel exactly as the real one does — that throw is
 * the whole failure being guarded against, so a double that quietly accepted the
 * write could not tell whether the guard was there.
 */
const fakeChannel = (readyState = 'open') => {
  const listeners = new Map<string, ((event: MessageEvent<unknown>) => void)[]>();
  const sent: ArrayBuffer[] = [];
  const channel: DataChannelLike & {
    sent: ArrayBuffer[];
    emit: (type: string, data?: unknown) => void;
    /** Put the channel into a state, the way a connection settling or dying does. */
    settle: (state: string) => void;
    closed: boolean;
  } = {
    label: 'writer-sync-control',
    readyState,
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    closed: false,
    sent,
    send: (data) => {
      if (channel.readyState !== 'open') {
        throw new DOMException(
          `Failed to execute 'send' on 'RTCDataChannel': RTCDataChannel.readyState is not 'open'`,
          'InvalidStateError',
        );
      }
      sent.push(data);
      channel.bufferedAmount += data.byteLength;
    },
    settle: (state) => {
      (channel as { readyState: string }).readyState = state;
      if (state === 'open') channel.emit('open');
      if (state === 'closed') channel.emit('close');
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

  it('advertises the ceiling it enforces, so senders can pack against it', () => {
    expect(createWebRtcTransport(fakeChannel()).maxMessageBytes).toBe(MAX_FRAME_BYTES);
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

describe('a channel that is not open', () => {
  it('holds what is written to one still connecting, and sends it when it opens', () => {
    // The device that creates a channel holds it in `connecting` while the
    // connection forms. Writing then throws, which is how the first frames after
    // a pairing were lost one by one as the user typed.
    const channel = fakeChannel('connecting');
    const transport = createWebRtcTransport(channel);

    expect(() => transport.send(new Uint8Array([1]))).not.toThrow();
    expect(channel.sent).toHaveLength(0);

    channel.settle('open');

    expect(channel.sent).toHaveLength(1);
  });

  it('ignores a write to one that has gone away', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    channel.settle('closed');

    expect(() => transport.send(new Uint8Array([1]))).not.toThrow();
    expect(channel.sent).toHaveLength(0);
  });

  it('ignores a write to one that is closing', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    (channel as { readyState: string }).readyState = 'closing';

    expect(() => transport.send(new Uint8Array([1]))).not.toThrow();
    expect(channel.sent).toHaveLength(0);
  });

  it('does not drain what it queued into a channel that died waiting', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    channel.bufferedAmount = BUFFER_HIGH_WATER_BYTES;
    transport.send(new Uint8Array([1]));

    channel.settle('closed');
    channel.bufferedAmount = 0;
    channel.emit('bufferedamountlow');

    expect(channel.sent).toHaveLength(0);
  });
});

describe('closure', () => {
  it('tells its consumer when the channel goes away by itself', () => {
    // The consumer caches this transport per scope. Without being told, it would
    // hand the same dead one back for every later frame.
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const onClosed = vi.fn();
    transport.onClosed?.(onClosed);

    channel.settle('closed');

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('says so once, however many times the channel reports it', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const onClosed = vi.fn();
    transport.onClosed?.(onClosed);

    channel.emit('close');
    channel.emit('close');
    channel.emit('error');

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('reports a channel that errors as gone', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const onClosed = vi.fn();
    transport.onClosed?.(onClosed);

    channel.emit('error');

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('stops telling a consumer that unsubscribed', () => {
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const onClosed = vi.fn();
    transport.onClosed?.(onClosed)?.();

    channel.settle('closed');

    expect(onClosed).not.toHaveBeenCalled();
  });

  it('does not report a close the consumer asked for itself', () => {
    // Closing is not news to whoever called it, and a consumer evicting its own
    // cache entry on the way out would be told about an entry it is discarding.
    const channel = fakeChannel();
    const transport = createWebRtcTransport(channel);
    const onClosed = vi.fn();
    transport.onClosed?.(onClosed);

    transport.close();

    expect(onClosed).not.toHaveBeenCalled();
  });
});
