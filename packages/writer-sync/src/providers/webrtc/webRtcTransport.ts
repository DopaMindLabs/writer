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
 * Whether the channel will carry a write at all.
 *
 * A channel exists in three states that are not `open`, and writing in any of
 * them throws: the device that creates one holds it in `connecting` while the
 * connection forms, and a connection that drops leaves it `closing` or `closed`.
 */
const isOpen = (channel: DataChannelLike): boolean => channel.readyState === 'open';

/** Past this the channel will never carry anything again. */
const isGone = (channel: DataChannelLike): boolean =>
  channel.readyState === 'closing' || channel.readyState === 'closed';

/**
 * What is waiting to go out, and whether the channel can still take it.
 *
 * Queueing serves two cases that look the same from here: a channel too full to
 * write into now, and one that has not finished connecting. Both drain on an
 * event from the channel — `bufferedamountlow` and `open` — rather than on a
 * timer, so there is no write-on-settle loop.
 */
const createChannelOutbox = (channel: DataChannelLike) => {
  const pending: ArrayBuffer[] = [];
  const watchers = new Set<() => void>();
  let closed = false;

  return {
    flush: (): void => {
      while (pending.length > 0 && isOpen(channel)) {
        if (channel.bufferedAmount >= BUFFER_HIGH_WATER_BYTES) return;
        const next = pending.shift();
        if (next === undefined) return;
        channel.send(next);
      }
    },
    send: (bytes: Uint8Array): void => {
      if (closed || isGone(channel)) return;
      if (bytes.byteLength > MAX_FRAME_BYTES) throw new FrameTooLargeError(bytes.byteLength);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      if (!isOpen(channel) || channel.bufferedAmount >= BUFFER_HIGH_WATER_BYTES) {
        pending.push(copy.buffer);
        return;
      }
      channel.send(copy.buffer);
    },
    /** The channel went away on its own. Told once, and only to those still listening. */
    markClosed: (): void => {
      if (closed) return;
      closed = true;
      pending.length = 0;
      for (const watcher of [...watchers]) watcher();
    },
    onClosed: (callback: () => void): (() => void) => {
      watchers.add(callback);
      return () => {
        watchers.delete(callback);
      };
    },
    /** Let go without a word: whoever closed this transport already knows. */
    release: (): void => {
      closed = true;
      pending.length = 0;
      watchers.clear();
    },
  };
};

/**
 * Wrap a data channel as a transport.
 *
 * Outbound frames that exceed the ceiling throw rather than being split: the
 * operation protocol chunks attachments itself, so an oversized frame here is a
 * bug in the caller, and silently fragmenting would hide it.
 *
 * A channel that is not open is never written to. It is not an error for a caller
 * to try — a live frame is written the moment a row is journalled, which may be
 * before the channel has finished connecting or after the connection has dropped
 * — so what can still be carried is queued and what cannot is dropped, with the
 * consumer told through {@link SyncTransport.onClosed} so it can stop using a
 * bearer that is gone.
 */
export const createWebRtcTransport = (channel: DataChannelLike): SyncTransport => {
  const listeners = new Set<(bytes: Uint8Array) => void>();
  const outbox = createChannelOutbox(channel);
  let released = false;

  channel.bufferedAmountLowThreshold = BUFFER_HIGH_WATER_BYTES / 2;

  const onMessageEvent = (event: MessageEvent<unknown>): void => {
    const bytes = toBytes(event.data);
    // A peer that sends something other than binary is not speaking this
    // protocol; drop it rather than guessing at an encoding.
    if (bytes === null) return;
    for (const listener of listeners) listener(bytes);
  };

  const detach = (): void => {
    channel.removeEventListener('message', onMessageEvent);
    channel.removeEventListener('bufferedamountlow', outbox.flush);
    channel.removeEventListener('open', outbox.flush);
    channel.removeEventListener('close', outbox.markClosed);
    channel.removeEventListener('error', outbox.markClosed);
  };

  channel.addEventListener('message', onMessageEvent);
  channel.addEventListener('bufferedamountlow', outbox.flush);
  channel.addEventListener('open', outbox.flush);
  channel.addEventListener('close', outbox.markClosed);
  channel.addEventListener('error', outbox.markClosed);

  return {
    sharesStore: false,
    maxMessageBytes: MAX_FRAME_BYTES,
    send: outbox.send,
    onMessage: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    onClosed: outbox.onClosed,
    close: () => {
      if (released) return;
      released = true;
      outbox.release();
      listeners.clear();
      detach();
      channel.close();
    },
  };
};
