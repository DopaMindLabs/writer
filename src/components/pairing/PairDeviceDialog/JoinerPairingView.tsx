import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { PairingCodeScanner } from '@/components/pairing/PairingCodeScanner/PairingCodeScanner';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import { TypographyMuted } from '@/components/ui/typography';
import type { PairingExchange } from './usePairingExchange';

/**
 * The reading device: scan the peer's code, then show the reply it produced.
 *
 * The reply is shown *beside* the verification gate, not before it. This device
 * knows the six digits as soon as it has answered, but its peer only learns them
 * once it has read this reply — so both have to stay on screen together or the
 * user is asked to compare a code the other device cannot yet show.
 */

export interface JoinerPairingViewProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const JoinerPairingView = ({ exchange, scanner }: JoinerPairingViewProps) => {
  const { t } = useTranslation('screens');

  if (exchange.answerPayload === null || exchange.sessionId === null) {
    return <PairingCodeScanner onPayload={exchange.submitOffer} scanner={scanner} />;
  }

  return (
    <>
      <TypographyMuted variant="xs" data-testid="pairing-answer-hint">
        {t('settings.pairing.answerHint')}
      </TypographyMuted>
      <PairingCodeDisplay
        payload={exchange.answerPayload}
        sessionId={exchange.sessionId}
        kind="answer"
      />
      {exchange.peer !== null && (
        <PairingVerification
          code={exchange.peer.verificationCode}
          onConfirm={exchange.confirm}
        />
      )}
    </>
  );
};
