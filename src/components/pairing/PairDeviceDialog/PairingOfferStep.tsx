import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { PairingCodeScanner } from '@/components/pairing/PairingCodeScanner/PairingCodeScanner';
import { Button } from '@/components/ui/Button';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { TypographyMuted } from '@/components/ui/typography';
import type { PairingExchange } from './usePairingExchange';

/**
 * The opening step, and the same one on both devices: this device's code, and
 * one way to read the other's.
 *
 * The code and the scanner are alternatives rather than neighbours. Shown
 * together they read as two things to do at once, and a user with a code on
 * screen and a camera beside it has no way to tell which device is meant to be
 * doing which — the very question this flow exists to stop asking.
 *
 * Once the peer is replying, the way in disappears: it holds this device's code
 * already, so scanning its offer as well would leave both waiting on each other.
 */

export interface PairingOfferStepProps {
  exchange: PairingExchange;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const PairingOfferStep = ({ exchange, scanner }: PairingOfferStepProps) => {
  const { t } = useTranslation('screens');
  const [scanning, setScanning] = useState(false);

  if (exchange.offerPayload === null || exchange.sessionId === null) return null;

  if (scanning) {
    return (
      <div className="flex flex-col gap-4" data-testid="pairing-offer-scanning">
        {exchange.ownCodeScanned && (
          <StatusGlyph kind="error" role="alert" data-testid="pairing-own-code">
            {t('settings.pairing.offerStep.ownCode')}
          </StatusGlyph>
        )}
        <PairingCodeScanner onPayload={exchange.submitPayload} scanner={scanner} />
        <Button
          kind="secondary"
          data-testid="pairing-show-code"
          onClick={() => {
            setScanning(false);
          }}
        >
          {t('settings.pairing.offerStep.showAction')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-offer-step">
      <TypographyMuted variant="xs">{t('settings.pairing.offerStep.body')}</TypographyMuted>
      <PairingCodeDisplay
        payload={exchange.offerPayload}
        sessionId={exchange.sessionId}
        kind="offer"
      />
      <Button
        data-testid="pairing-scan-start"
        onClick={() => {
          setScanning(true);
        }}
      >
        {t('settings.pairing.offerStep.scanAction')}
      </Button>
    </div>
  );
};
