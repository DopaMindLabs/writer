import type { SyncTransport } from '../../core/transport.types';
import {
  BUFFER_HIGH_WATER_BYTES,
  FrameTooLargeError,
  MAX_FRAME_BYTES,
} from './frameCeiling';
import { createRoomGate } from './channelRoom';
import { TransportBackpressureError, createOutboxQueue } from './outboxQueue';
import {
  INBOUND_WINDOW_MILLIS,
  InboundRateLimitError,
  MAX_INBOUND_BYTES,
  MAX_INBOUND_MESSAGES,
  createInboundLimiter,
  type InboundLimiter,
} from './inboundLimiter';

export { BUFFER_HIGH_WATER_BYTES, FrameTooLargeError, MAX_FRAME_BYTES } from './frameCeiling';
export {
  MAX_OUTBOX_BYTES,
  MAX_OUTBOX_MESSAGES,
  TransportBackpressureError,
} from './outboxQueue';
export {
  INBOUND_WINDOW_MILLIS,
  InboundRateLimitError,
  MAX_INBOUND_BYTES,
  MAX_INBOUND_MESSAGES,
} from './inboundLimiter';

/** A peer speaking something that is not this protocol at all. */
export class NonBinaryMessageError extends Error {
  constructor() {
    super('A peer sent a message that carried no bytes');
    this.name = 'NonBinaryMessageError';
  }
}

/**
 * A {@link SyncTransport} over one WebRTC data channel. Remote writes are
 * persisted locally, while encrypted and signed frames provide the trust
 * boundary independently of the channel.
 */

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

const toBytes = (data: unknown): Uint8Array | null => {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
};

/** Classifies whether a channel can send now, later or never. */
const isOpen = (channel: DataChannelLike): boolean => channel.readyState === 'open';

/** Past this the channel will never carry anything again. */
const isGone = (channel: DataChannelLike): boolean =>
  channel.readyState === 'closing' || channel.readyState === 'closed';

/** Queues writes until `open` or `bufferedamountlow` signals capacity. */
const createChannelOutbox = (channel: DataChannelLike) => {
  const pending = createOutboxQueue();
  const watchers = new Set<(reason?: Error) => void>();
  let closed = false;

  /** Whether a write would be taken now, or never will be. */
  const settled = (): boolean =>
    closed ||
    isGone(channel) ||
    (isOpen(channel) && channel.bufferedAmount < BUFFER_HIGH_WATER_BYTES);
  const room = createRoomGate(settled);

  /** Write what is queued, oldest first, for as long as the channel will take it. */
  const drain = (): void => {
    while (pending.size > 0 && isOpen(channel)) {
      if (channel.bufferedAmount >= BUFFER_HIGH_WATER_BYTES) break;
      const next = pending.take();
      if (next === undefined) break;
      channel.send(next);
    }
    room.wake();
  };

  return {
    whenReady: room.whenReady,
    flush: drain,
    send: (bytes: Uint8Array): void => {
      if (closed || isGone(channel)) return;
      if (bytes.byteLength > MAX_FRAME_BYTES) throw new FrameTooLargeError(bytes.byteLength);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      // Anything already queued goes first. The channel is ordered and the
      // exchange above it reads a sequence, so a write that overtook the queue
      // would not arrive early — it would arrive wrong. The low-water threshold
      // sits below the high-water mark, so a buffer draining into the band
      // between them offers room with no event to drain on: without this, that
      // is exactly where a later write passes an earlier one.
      if (pending.size > 0 || !isOpen(channel) || channel.bufferedAmount >= BUFFER_HIGH_WATER_BYTES) {
        pending.add(copy.buffer);
        drain();
        return;
      }
      channel.send(copy.buffer);
    },
    /**
     * The session is over. Told once, and only to those still listening; a
     * reason travels with it when this device is the one ending it, so a
     * consumer can say why sync stopped rather than only that it did.
     */
    markClosed: (reason?: Error): void => {
      if (closed) return;
      closed = true;
      pending.discard();
      // Nobody is left to write to, and a sender parked forever would never
      // learn that. It is woken to find a transport that is gone.
      room.wake();
      for (const watcher of [...watchers]) watcher(reason);
    },
    onClosed: (callback: (reason?: Error) => void): (() => void) => {
      watchers.add(callback);
      return () => {
        watchers.delete(callback);
      };
    },
    /** Let go without a word: whoever closed this transport already knows. */
    release: (): void => {
      closed = true;
      pending.discard();
      room.wake();
      watchers.clear();
    },
  };
};

/**
 * The gate every inbound message passes: is it this protocol at all, and is the
 * peer still inside what this session will carry.
 */
const inboundHandler = (options: {
  limiter: InboundLimiter;
  deliver: (bytes: Uint8Array) => void;
  fail: (reason: Error) => void;
}) => {
  const { limiter, deliver, fail } = options;
  return (event: MessageEvent<unknown>): void => {
    const bytes = toBytes(event.data);
    // A peer that sends something other than binary is not speaking this
    // protocol at all, and is not one to hold a session open for.
    if (bytes === null) {
      fail(new NonBinaryMessageError());
      return;
    }
    // The ceiling binds in both directions. Outbound it stops a caller sending
    // what the channel would refuse; inbound it is what stops one message
    // becoming one enormous allocation and parse, whatever the rate budget
    // still has left.
    if (bytes.byteLength > MAX_FRAME_BYTES) {
      fail(new FrameTooLargeError(bytes.byteLength));
      return;
    }
    // Refusing the excess and staying open would leave an apparently healthy
    // session whose catch-up can never complete.
    if (!limiter.consume({ messages: 1, bytes: bytes.byteLength })) {
      fail(new InboundRateLimitError());
      return;
    }
    deliver(bytes);
  };
};

/**
 * Subscribe to everything the channel has to say, and hand back the way to stop
 * listening. Paired here so a listener added can never be one detach forgets.
 */
const attachChannel = (options: {
  channel: DataChannelLike;
  onMessage: (event: MessageEvent<unknown>) => void;
  onRoom: () => void;
  onGone: () => void;
}): (() => void) => {
  const { channel, onMessage, onRoom, onGone } = options;
  channel.addEventListener('message', onMessage);
  channel.addEventListener('bufferedamountlow', onRoom);
  channel.addEventListener('open', onRoom);
  channel.addEventListener('close', onGone);
  channel.addEventListener('error', onGone);
  return () => {
    channel.removeEventListener('message', onMessage);
    channel.removeEventListener('bufferedamountlow', onRoom);
    channel.removeEventListener('open', onRoom);
    channel.removeEventListener('close', onGone);
    channel.removeEventListener('error', onGone);
  };
};

/**
 * Write, or end the session that cannot hold what it is being given.
 *
 * The throw still reaches the caller: it is the only party that knows what it
 * was trying to send, and the only one that can decide whether to report it.
 */
const guardedSend = (
  outbox: { send: (bytes: Uint8Array) => void },
  fail: (reason: Error) => void,
) => (bytes: Uint8Array): void => {
  try {
    outbox.send(bytes);
  } catch (error) {
    if (error instanceof TransportBackpressureError) fail(error);
    throw error;
  }
};

/** The inbound limiter this transport runs, at the protocol's own constants. */
const inboundLimiterFor = (now: () => number): InboundLimiter =>
  createInboundLimiter({
    messagesPerWindow: MAX_INBOUND_MESSAGES,
    bytesPerWindow: MAX_INBOUND_BYTES,
    windowMs: INBOUND_WINDOW_MILLIS,
    now,
  });

/**
 * Wraps a data channel as a bounded transport. It queues frames while the link
 * can recover, reports closure to consumers and rejects frames that exceed the
 * protocol ceiling; attachment splitting belongs to the operation protocol.
 */
export const createWebRtcTransport = (
  channel: DataChannelLike,
  options: { now?: () => number } = {},
): SyncTransport => {
  const listeners = new Set<(bytes: Uint8Array) => void>();
  const outbox = createChannelOutbox(channel);
  const limiter = inboundLimiterFor(options.now ?? (() => Date.now()));
  let released = false;

  channel.bufferedAmountLowThreshold = BUFFER_HIGH_WATER_BYTES / 2;

  const onMessageEvent = inboundHandler({
    limiter,
    deliver: (bytes) => {
      for (const listener of listeners) listener(bytes);
    },
    fail: (reason) => {
      failAndClose(reason);
    },
  });

  const detach = attachChannel({
    channel,
    onMessage: onMessageEvent,
    onRoom: outbox.flush,
    // The bearer went away by itself, so there is no reason of ours to give.
    onGone: () => {
      outbox.markClosed();
    },
  });

  /**
   * End the session on a failure the consumer must see: queue discarded,
   * listeners detached, channel closed, and the reason carried to whoever is
   * watching — the same signal a channel dying on its own produces.
   */
  const failAndClose = (reason: Error): void => {
    if (released) return;
    released = true;
    outbox.markClosed(reason);
    listeners.clear();
    detach();
    channel.close();
  };

  const write = guardedSend(outbox, failAndClose);

  return {
    sharesStore: false,
    maxMessageBytes: MAX_FRAME_BYTES,
    send: write,
    sendWhenReady: async (bytes) => {
      // Waits for the bearer rather than filling the queue in front of it: a
      // sender that knows how much it has to say sets its own pace against the
      // channel, instead of discovering the bound as a failure.
      await outbox.whenReady();
      write(bytes);
    },
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
