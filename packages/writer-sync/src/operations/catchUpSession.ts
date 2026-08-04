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
 */

export interface CatchUpSession {
  /** The running exchange, for callers that need to drive it directly. */
  exchange: CatchUpExchange;
  /** Resolves once this device has published its opening manifest. */
  opened: Promise<void>;
  stop: () => void;
}

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
    send: (message) => {
      transport.send(encodeCatchUpMessage(message));
    },
  });

  const report = (error: unknown): void => {
    onError?.(error);
  };

  let stopped = false;
  // One consumer, in arrival order: each message waits for the whole of the
  // previous one, decode included, before it reaches the exchange.
  let tail: Promise<void> = Promise.resolve();

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    off();
  };

  const off = transport.onMessage((bytes) => {
    if (stopped) return;
    tail = tail
      .then(() => exchange.receive(decodeCatchUpMessage(bytes)))
      .catch((error: unknown) => {
        report(error);
        // The exchange carries state across the batches of one reply, so a
        // message that failed part-way leaves it half-updated. Later messages
        // must not run against that, and a peer whose session has failed is
        // told by the connection going away rather than by silence.
        stop();
        transport.close();
      });
  });

  return {
    exchange,
    opened: exchange.start().catch(report),
    stop,
  };
};
