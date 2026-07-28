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
 * A peer that sends rubbish is reported and ignored rather than allowed to throw
 * out of an event listener: one bad message must not end a session that is
 * otherwise transferring correctly, and an unhandled rejection inside a channel
 * callback would do exactly that.
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
    send: (message) => {
      transport.send(encodeCatchUpMessage(message));
    },
  });

  const report = (error: unknown): void => {
    onError?.(error);
  };

  const off = transport.onMessage((bytes) => {
    void (async () => {
      await exchange.receive(decodeCatchUpMessage(bytes));
    })().catch(report);
  });

  return {
    exchange,
    opened: exchange.start().catch(report),
    stop: off,
  };
};
