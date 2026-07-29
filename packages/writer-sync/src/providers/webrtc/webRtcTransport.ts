import type { SyncTransport } from '../../core/transport.types';

/**
 * A {@link SyncTransport} over one WebRTC data channel, per runbook §22.
 *
 * `sharesStore` is `false`: a remote peer persists to its own store, so this
 * device must persist what arrives rather than assuming the write already
 * happened — the opposite of a `BroadcastChannel` between tabs.
 *
 * The channel is a bearer, not a trust boundary. DTLS protects it in transit,
 * but every frame it carries is independently encrypted and device-signed, so a
 * compromised channel still cannot forge or read content.
 */

/** Above this, a peer is flooding rather than syncing (threat model §5.13). */
export const MAX_FRAME_BYTES = 262_144;

/** Stop writing once this much is queued; resume on `bufferedamountlow`. */
export const BUFFER_HIGH_WATER_BYTES = 1_048_576;

/** The subset of `RTCDataChannel` this transport needs, so tests need no WebRTC. */
export interface DataChannelLike {
  /** What the channel is for. Routes a channel the peer opened to its purpose. */
  readonly label: string;
  readonly readyState: string;
  bufferedAmount: number;
  bufferedAmountLowThreshold: number;
  send: (data: ArrayBuffer) => void;
  close: () => void;
  addEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => void;
  removeEventListener: (type: string, listener: (event: MessageEvent<unknown>) => void) => void;
}

export class FrameTooLargeError extends Error {
  constructor(size: number) {
    super(`Frame of ${String(size)} bytes exceeds the ${String(MAX_FRAME_BYTES)} byte limit`);
    this.name = 'FrameTooLargeError';
  }
}

const toBytes = (data: unknown): Uint8Array | null => {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
};

/**
 * Wrap a data channel as a transport.
 *
 * Outbound frames that exceed the ceiling throw rather than being split: the
 * operation protocol chunks attachments itself, so an oversized frame here is a
 * bug in the caller, and silently fragmenting would hide it.
 *
 * Backpressure queues locally instead of writing into a full channel, and the
 * queue drains on `bufferedamountlow` rather than on a timer — there is no
 * write-on-settle loop.
 */
export const createWebRtcTransport = (channel: DataChannelLike): SyncTransport => {
  const listeners = new Set<(bytes: Uint8Array) => void>();
  const pending: ArrayBuffer[] = [];
  let closed = false;

  channel.bufferedAmountLowThreshold = BUFFER_HIGH_WATER_BYTES / 2;

  const flush = (): void => {
    while (pending.length > 0 && channel.bufferedAmount < BUFFER_HIGH_WATER_BYTES) {
      const next = pending.shift();
      if (next === undefined) return;
      channel.send(next);
    }
  };

  const onMessageEvent = (event: MessageEvent<unknown>): void => {
    const bytes = toBytes(event.data);
    // A peer that sends something other than binary is not speaking this
    // protocol; drop it rather than guessing at an encoding.
    if (bytes === null) return;
    for (const listener of listeners) listener(bytes);
  };

  channel.addEventListener('message', onMessageEvent);
  channel.addEventListener('bufferedamountlow', flush);

  return {
    sharesStore: false,
    maxMessageBytes: MAX_FRAME_BYTES,
    send: (bytes) => {
      if (closed) return;
      if (bytes.byteLength > MAX_FRAME_BYTES) throw new FrameTooLargeError(bytes.byteLength);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      if (channel.bufferedAmount >= BUFFER_HIGH_WATER_BYTES) {
        pending.push(copy.buffer);
        return;
      }
      channel.send(copy.buffer);
    },
    onMessage: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    close: () => {
      if (closed) return;
      closed = true;
      pending.length = 0;
      listeners.clear();
      channel.removeEventListener('message', onMessageEvent);
      channel.removeEventListener('bufferedamountlow', flush);
      channel.close();
    },
  };
};
