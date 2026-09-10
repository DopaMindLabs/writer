import { useTranslation } from 'react-i18next';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { Button } from '@/components/ui/Button';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { TypographyMuted } from '@/components/ui/typography';
import type { PairingExchange } from './usePairingExchange';

/**
 * The showing posture: this device's code, for the other device to read.
 *
 * Gathering starts when the dialog opens, not when this renders, so the code
 * is usually ready the moment it is asked for; until it is, the wait is named
 * rather than shown as an empty frame. The one action here moves on to the
 * scanner once the peer has read the code — nothing arrives on this device
 * when the other one reads it, so the user is the only possible trigger.
 */

export interface PairingOfferCodeProps {
  exchange: PairingExchange;
  /** The peer has read this code; move on to scanning its reply. */
  onScanReply: () => void;
}

export const PairingOfferCode = ({ exchange, onScanReply }: PairingOfferCodeProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-offer-step">
      <TypographyMuted variant="xs">{t('settings.pairing.offerStep.body')}</TypographyMuted>
      {exchange.offerPayload === null || exchange.sessionId === null ? (
        <StatusGlyph kind="info" role="status" data-testid="pair-device-gathering">
          {t('settings.pairing.creating')}
        </StatusGlyph>
      ) : (
        <PairingCodeDisplay
          payload={exchange.offerPayload}
          sessionId={exchange.sessionId}
          kind="offer"
        />
      )}
      <Button data-testid="pairing-scan-start" onClick={onScanReply}>
        {t('settings.pairing.offerStep.scanAction')}
      </Button>
    </div>
  );
};
