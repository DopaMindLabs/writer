import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import { PairingOfferStep } from './PairingOfferStep';
import { PairingReplyStep } from './PairingReplyStep';
import type { PairingExchange } from './usePairingExchange';

/**
 * What the dialog shows for the phase the exchange is in — one thing at a time.
 *
 * Separated from the dialog frame so each stays one readable unit: the frame
 * owns the modal, this owns the flow. Every phase resolves to a single step with
 * a single action, so the user is never looking at a code beside a scanner, or a
 * code beside a verification gate, working out which of the two is their turn.
 */

export interface PairDeviceDialogBodyProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

/** The comparison, once this device has nothing left to hand over. */
const verification = (exchange: PairingExchange) =>
  exchange.peer === null ? null : (
    <PairingVerification code={exchange.peer.verificationCode} onConfirm={exchange.confirm} />
  );

export const PairDeviceDialogBody = ({ exchange, scanner }: PairDeviceDialogBodyProps) => {
  const { t } = useTranslation('screens');

  if (exchange.phase === 'creating') {
    return (
      <StatusGlyph kind="info" role="status" data-testid="pair-device-gathering">
        {t('settings.pairing.creating')}
      </StatusGlyph>
    );
  }

  if (exchange.phase === 'failed') {
    return (
      <InlineBanner kind="error" data-testid="pair-device-failed">
        {t('settings.pairing.failed')}
      </InlineBanner>
    );
  }

  if (exchange.phase === 'authenticating') {
    return (
      <StatusGlyph kind="info" role="status" data-testid="pair-device-authenticating">
        {t('settings.pairing.authenticating')}
      </StatusGlyph>
    );
  }

  if (exchange.phase === 'complete') {
    return (
      <InlineBanner
        kind="success"
        title={t('settings.pairing.complete.title')}
        data-testid="pair-device-complete"
      >
        {t('settings.pairing.complete.body')}
      </InlineBanner>
    );
  }

  if (exchange.phase === 'awaiting-confirmation') {
    // The reading device has a code to hand back before anyone can compare
    // digits; the device that was read has nothing left but the comparison.
    return exchange.role === 'joiner' ? (
      <PairingReplyStep exchange={exchange} />
    ) : (
      verification(exchange)
    );
  }

  return <PairingOfferStep exchange={exchange} scanner={scanner} />;
};
