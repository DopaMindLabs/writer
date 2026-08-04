import type { SyncTransport } from '../core/transport.types';
import {
  createCatchUpExchange,
  type CatchUpExchange,
  type CatchUpPorts,
} from './catchUpExchange';
import { decodeCatchUpMessage, encodeCatchUpMessage } from './catchUpMessage';

/**
 * Bind a {@link CatchUpExchange} to a transport: encode what it sends, decode
 * what arrives, and keep a malformed message from taking the session down.
 *
 * The transport is any bearer the engine already speaks — a WebRTC data channel
 * today, anything implementing `SyncTransport` tomorrow — so the exchange itself
 * stays free of both WebRTC and the wire format.
 *
 * A peer that sends rubbish is reported rather than allowed to throw out of an
 * event listener, where it would surface as an unhandled rejection. It also ends
 * the session: the exchange is stateful across the batches of one reply, and
 * carrying on would run later messages against half-updated state.
 *
 * **Arrival order is kept.** A data channel delivers in order, but handling is
 * asynchronous, and a callback that started a promise per message let a later
 * batch overtake an earlier one still verifying or writing — resetting the
 * acknowledgement map before the frames it covered had been admitted. Each
 * message therefore waits on the whole of the one before it, decode included.
 * Ordering is kept in one place rather than by delays or locks inside the
 * handlers, which would have to be right in every one of them.
 *
 * **Waiting is not free.** Ordering means every message that arrives while one
 * is being handled is *retained*, and a bearer's rate limit bounds a rate, not
 * a quantity: a peer arriving faster than crypto and IndexedDB drain, window
 * after window, grows this queue without ever exceeding its rate. So the queue
 * is bounded in its own right, and a peer that outruns it ends the session
 * rather than the tab.
 */

/**
 * What one session will hold undecoded while it works through the queue.
 *
 * Mirrors the outbox bound on the other side of the same link — a session is
 * symmetric, and what this device will hold for a peer is what it asks a peer
 * to hold for it.
 */
export const MAX_SESSION_QUEUE_MESSAGES = 64;
export const MAX_SESSION_QUEUE_BYTES = 8 * 1024 * 1024;

/** A peer arriving faster than this session can work through what it sent. */
export class SessionQueueOverflowError extends Error {
  readonly queuedMessages: number;
  readonly queuedBytes: number;

  constructor(options: { queuedMessages: number; queuedBytes: number }) {
    super(
      `Catch-up session already holds ${String(options.queuedMessages)} message(s) and ${String(options.queuedBytes)} bytes`,
    );
    this.name = 'SessionQueueOverflowError';
    this.queuedMessages = options.queuedMessages;
    this.queuedBytes = options.queuedBytes;
  }
}

export interface CatchUpSession {
  /** The running exchange, for callers that need to drive it directly. */
  exchange: CatchUpExchange;
  /** Resolves once this device has published its opening manifest. */
  opened: Promise<void>;
  stop: () => void;
}

/** What the session is holding, and whether it will hold any more. */
const createQueueBudget = () => {
  let queuedMessages = 0;
  let queuedBytes = 0;

  return {
    /** Take room for one message, or say why there is none. */
    claim: (byteLength: number): SessionQueueOverflowError | null => {
      if (
        queuedMessages >= MAX_SESSION_QUEUE_MESSAGES ||
        queuedBytes + byteLength > MAX_SESSION_QUEUE_BYTES
      ) {
        return new SessionQueueOverflowError({ queuedMessages, queuedBytes });
      }
      queuedMessages += 1;
      queuedBytes += byteLength;
      return null;
    },
    release: (byteLength: number): void => {
      queuedMessages -= 1;
      queuedBytes -= byteLength;
    },
  };
};

/**
 * The exchange's writes, over one bearer: everything says itself immediately,
 * and what can wait for room waits — which is what stops a page of chunks
 * outrunning the outbox in front of the channel.
 */
const writesOver = (transport: SyncTransport): Pick<CatchUpPorts, 'send' | 'sendWhenReady'> => {
  const whenReady = transport.sendWhenReady?.bind(transport);
  return {
    send: (message) => {
      transport.send(encodeCatchUpMessage(message));
    },
    sendWhenReady:
      whenReady === undefined
        ? undefined
        : (message) => whenReady(encodeCatchUpMessage(message)),
  };
};

export const startCatchUpSession = (options: {
  transport: SyncTransport;
  ports: Omit<CatchUpPorts, 'send'>;
  onError?: (error: unknown) => void;
}): CatchUpSession => {
  const { transport, ports, onError } = options;

  const exchange = createCatchUpExchange({
    ...ports,
    // The bearer's ceiling travels with its send: replies are packed against
    // the same budget the transport will enforce.
    maxMessageBytes: transport.maxMessageBytes,
    ...writesOver(transport),
  });

  const report = (error: unknown): void => {
    onError?.(error);
  };

  const queue = createQueueBudget();
  let stopped = false;
  let tail: Promise<void> = Promise.resolve();

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    off();
    offClosed?.();
  };

  /** End the session on something it cannot carry on through. */
  const fail = (error: unknown): void => {
    report(error);
    stop();
    transport.close();
  };

  const off = transport.onMessage((bytes) => {
    if (stopped) return;
    const overflow = queue.claim(bytes.byteLength);
    if (overflow !== null) {
      fail(overflow);
      return;
    }
    // Owned rather than borrowed: what a bearer hands over may be a view onto a
    // buffer it reuses, and this one is held until the queue reaches it.
    const owned = bytes.slice();
    tail = tail
      .then(() => exchange.receive(decodeCatchUpMessage(owned)))
      .catch((error: unknown) => {
        // The exchange carries state across the batches of one reply, so a
        // message that failed part-way leaves it half-updated. Later messages
        // must not run against that, and a peer whose session has failed is
        // told by the connection going away rather than by silence.
        fail(error);
      })
      .finally(() => {
        queue.release(owned.byteLength);
      });
  });

  // The bearer refuses a peer this session never sees — a flood, or a message
  // it will not carry — and that refusal is why sync stopped. Without this it
  // reaches the transport's consumer and no further.
  const offClosed = transport.onClosed?.((reason) => {
    if (stopped) return;
    stop();
    if (reason !== undefined) report(reason);
  });

  return {
    exchange,
    opened: exchange.start().catch(report),
    stop,
  };
};
