import type { QrScanner } from 'writer-qr/scan';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { PairingCodeScanner } from '@/components/pairing/PairingCodeScanner/PairingCodeScanner';
import type { PairingExchange } from './usePairingExchange';

/**
 * The showing device, waiting for its peer's reply.
 *
 * The offer stays on screen alongside the scanner rather than being replaced by
 * it: the other device is still reading this code while this one waits, and a
 * code that vanished the moment the scanner appeared would strand a user
 * halfway through the exchange.
 */

export interface InitiatorPairingViewProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const InitiatorPairingView = ({ exchange, scanner }: InitiatorPairingViewProps) => {
  if (exchange.offerPayload === null || exchange.sessionId === null) return null;

  return (
    <>
      <PairingCodeDisplay
        payload={exchange.offerPayload}
        sessionId={exchange.sessionId}
        kind="offer"
      />
      <PairingCodeScanner onPayload={exchange.acceptAnswer} scanner={scanner} />
    </>
  );
};
