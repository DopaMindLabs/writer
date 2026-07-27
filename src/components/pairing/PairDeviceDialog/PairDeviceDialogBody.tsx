import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { PairingCodeScanner } from '@/components/pairing/PairingCodeScanner/PairingCodeScanner';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import type { PairingExchange } from './usePairingExchange';

/**
 * What the dialog shows for the phase the exchange is in.
 *
 * Separated from the dialog frame so each stays one readable unit: the frame
 * owns the modal, this owns the flow. The offer stays on screen alongside the
 * scanner, because the other device is still reading it while this one waits.
 */

export interface PairDeviceDialogBodyProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

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

  if (exchange.phase === 'awaiting-confirmation' && exchange.peer !== null) {
    return (
      <PairingVerification
        code={exchange.peer.verificationCode}
        onConfirm={exchange.confirm}
      />
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
