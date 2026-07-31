import { useState } from 'react';
import type { QrScanner } from 'writer-qr/scan';
import { PairingOfferCode } from './PairingOfferCode';
import { PairingOfferScan } from './PairingOfferScan';
import { PairingStartStep } from './PairingStartStep';
import type { PairingExchange } from './usePairingExchange';

/**
 * The opening step, and the same one on both devices: a choice first, then one
 * thing at a time — this device's code, or a way to read the other's.
 *
 * The postures are alternatives rather than neighbours. A code and a scanner
 * shown together read as two things to do at once, and a user with a code on
 * screen and a camera beside it has no way to tell which device is meant to be
 * doing which — the very question this flow exists to stop asking.
 *
 * The posture is view state only. The exchange gathers from the moment the
 * dialog opens, so choosing "show" reveals a code that is usually already
 * prepared, and a payload read in any posture still settles the roles
 * (`resolvePairingRole`) — neither choice commits the protocol to anything.
 */

type OfferPosture = 'start' | 'show' | 'scan';

export interface PairingOfferStepProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const PairingOfferStep = ({ exchange, scanner }: PairingOfferStepProps) => {
  const [posture, setPosture] = useState<OfferPosture>('start');

  const show = () => {
    setPosture('show');
  };
  const scan = () => {
    setPosture('scan');
  };

  if (posture === 'start') return <PairingStartStep onShow={show} onScan={scan} />;

  if (posture === 'scan') {
    return <PairingOfferScan exchange={exchange} onShowCode={show} scanner={scanner} />;
  }

  return <PairingOfferCode exchange={exchange} onScanReply={scan} />;
};
