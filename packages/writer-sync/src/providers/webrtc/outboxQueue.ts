import { MAX_FRAME_BYTES } from './frameCeiling';

/**
 * What this device will hold for a channel that cannot take it yet.
 *
 * `bufferedAmount` bounds the browser's own buffer; neither it nor
 * `bufferedamountlow` says anything about the queue kept in front of it, which
 * grows on every write to a channel still connecting or already full. An
 * ordinary stalled connection with the user still writing is enough to grow it
 * until the tab stops responding.
 *
 * Both bounds are derived from the largest message the protocol may legally
 * send. The byte bound holds 32 of them — well past any catch-up burst, since
 * replies are packed against `MAX_FRAME_BYTES` and drain as the channel reports
 * room — while capping the queue at 8 MiB. The message bound catches the other
 * shape of the same failure, thousands of small live frames, and matches the
 * inbound hold bound in `filterChannelByKind`.
 */
export const MAX_OUTBOX_MESSAGES = 64;
export const MAX_OUTBOX_BYTES = 32 * MAX_FRAME_BYTES;

/** The outbox is full: this session cannot carry what it is being given. */
export class TransportBackpressureError extends Error {
  readonly pendingBytes: number;
  readonly attemptedBytes: number;

  constructor(options: { pendingBytes: number; attemptedBytes: number }) {
    super(
      `Outbox holding ${String(options.pendingBytes)} bytes cannot take another ${String(options.attemptedBytes)}`,
    );
    this.name = 'TransportBackpressureError';
    this.pendingBytes = options.pendingBytes;
    this.attemptedBytes = options.attemptedBytes;
  }
}

export interface OutboxQueue {
  readonly size: number;
  /** Queue a message, or refuse the session because it will not fit. */
  add: (message: ArrayBuffer) => void;
  /** The next message out, and the room it occupied with it. */
  take: () => ArrayBuffer | undefined;
  /** Forget everything queued, counters included. */
  discard: () => void;
}

/**
 * A queue that refuses rather than forgets.
 *
 * Neither the oldest message nor the newest is dropped to make room: an
 * operation stays in the journal, so a session that fails here reconnects and
 * catches up, whereas a silent drop leaves success and data loss looking
 * identical from the outside.
 */
export const createOutboxQueue = (): OutboxQueue => {
  const pending: ArrayBuffer[] = [];
  let pendingBytes = 0;

  return {
    get size() {
      return pending.length;
    },
    add: (message) => {
      if (
        pending.length >= MAX_OUTBOX_MESSAGES ||
        pendingBytes + message.byteLength > MAX_OUTBOX_BYTES
      ) {
        throw new TransportBackpressureError({
          pendingBytes,
          attemptedBytes: message.byteLength,
        });
      }
      pending.push(message);
      pendingBytes += message.byteLength;
    },
    take: () => {
      const next = pending.shift();
      if (next !== undefined) pendingBytes -= next.byteLength;
      return next;
    },
    discard: () => {
      pending.length = 0;
      pendingBytes = 0;
    },
  };
};
