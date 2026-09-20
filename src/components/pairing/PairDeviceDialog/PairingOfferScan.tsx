import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import { PairingCodeScanner } from '@/components/pairing/PairingCodeScanner/PairingCodeScanner';
import { Button } from '@/components/ui/Button';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import type { PairingExchange } from './usePairingExchange';

/**
 * The scanning posture: one way to read whatever the other device is showing.
 *
 * It takes an offer and a reply alike — the payload settles which half arrived
 * (`resolvePairingRole`), so this surface never has to know whether the user is
 * starting the exchange or finishing it. A device pointed at its own screen is
 * told so with the scanner left open, because the fix is another scan rather
 * than another screen.
 */

export interface PairingOfferScanProps {
  exchange: PairingExchange;
  /** Leave the scanner and show this device's code instead. */
  onShowCode: () => void;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const PairingOfferScan = ({ exchange, onShowCode, scanner }: PairingOfferScanProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-offer-scanning">
      {exchange.ownCodeScanned && (
        <StatusGlyph kind="error" role="alert" data-testid="pairing-own-code">
          {t('settings.pairing.offerStep.ownCode')}
        </StatusGlyph>
      )}
      <PairingCodeScanner onPayload={exchange.submitPayload} scanner={scanner} />
      <Button kind="secondary" data-testid="pairing-show-code" onClick={onShowCode}>
        {t('settings.pairing.offerStep.showAction')}
      </Button>
    </div>
  );
};
