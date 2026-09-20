import { MAX_FRAME_BYTES } from './frameCeiling';

/**
 * What one peer may send this device, per window.
 *
 * `MAX_FRAME_BYTES` bounds a single message; nothing bounded how many arrived.
 * Every inbound message costs JSON decoding, a hash, a signature check, AES-GCM
 * and an IndexedDB write, so a compromised paired device — or a broken one
 * stuck in a resend loop — could keep the tab busy indefinitely without ever
 * sending anything oversized (threat model §5.13).
 *
 * The bounds are set above the largest legitimate burst rather than at it. The
 * heaviest honest traffic is an attachment page: 256 chunks of roughly 171 KiB,
 * spread across windows by the sender's own outbox bound and the channel's
 * high-water mark. 32 MiB and 512 messages a second sit above that and still
 * bound a flood to something this device can refuse in time.
 */
export const INBOUND_WINDOW_MILLIS = 1_000;
export const MAX_INBOUND_MESSAGES = 512;
export const MAX_INBOUND_BYTES = 128 * MAX_FRAME_BYTES;

/** A peer sending more than the session will carry. */
export class InboundRateLimitError extends Error {
  constructor() {
    super(
      `A peer exceeded ${String(MAX_INBOUND_MESSAGES)} messages or ${String(MAX_INBOUND_BYTES)} bytes per ${String(INBOUND_WINDOW_MILLIS)}ms`,
    );
    this.name = 'InboundRateLimitError';
  }
}

export interface InboundLimiterOptions {
  messagesPerWindow: number;
  bytesPerWindow: number;
  windowMs: number;
  /** Injected so the bounds can be tested without a real clock. */
  now: () => number;
}

export interface InboundLimiter {
  /** Whether this message fits what is left, taking it if so. */
  consume: (cost: { messages: number; bytes: number }) => boolean;
}

/** One budget that refills at a steady rate, capped at a full window's worth. */
const createBucket = (options: {
  capacity: number;
  windowMs: number;
  now: () => number;
}) => {
  const { capacity, windowMs, now } = options;
  let available = capacity;
  let refilledAt = now();

  /**
   * Continuous rather than stepped: a window that resets on a boundary lets a
   * peer spend a full budget on either side of one instant.
   */
  const refill = (): number => {
    const at = now();
    available = Math.min(capacity, available + ((at - refilledAt) * capacity) / windowMs);
    refilledAt = at;
    return available;
  };

  return {
    canAfford: (cost: number): boolean => refill() >= cost,
    take: (cost: number): void => {
      available -= cost;
    },
  };
};

/**
 * Message rate and byte rate together, because either alone leaves a gap: one
 * enormous message a second passes a message bound, and a flood of empty ones
 * passes a byte bound while still costing a decode apiece.
 *
 * Both are checked before either is charged, so a refusal never spends one
 * budget on a message the other would not have carried.
 */
export const createInboundLimiter = (options: InboundLimiterOptions): InboundLimiter => {
  const messages = createBucket({
    capacity: options.messagesPerWindow,
    windowMs: options.windowMs,
    now: options.now,
  });
  const bytes = createBucket({
    capacity: options.bytesPerWindow,
    windowMs: options.windowMs,
    now: options.now,
  });

  return {
    consume: (cost) => {
      if (!messages.canAfford(cost.messages) || !bytes.canAfford(cost.bytes)) {
        return false;
      }
      messages.take(cost.messages);
      bytes.take(cost.bytes);
      return true;
    },
  };
};
