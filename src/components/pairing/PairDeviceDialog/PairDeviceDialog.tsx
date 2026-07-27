import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { usePairingOffer, type UsePairingOfferOptions } from './usePairingOffer';

/**
 * The first half of pairing: this device gathers its offer and shows it for the
 * other device to read.
 *
 * Gathering starts when the dialog opens and stops when it closes, so nothing is
 * held open in the background. The code shown here carries no secret — no
 * passphrase, recovery code, account root or content key ever rides a QR payload
 * (runbook §17) — which is why it is safe to display before any device has been
 * confirmed.
 */

export interface PairDeviceDialogProps extends Pick<UsePairingOfferOptions, 'createSignaller'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PairDeviceDialog = ({
  open,
  onOpenChange,
  createSignaller,
}: PairDeviceDialogProps) => {
  const { t } = useTranslation('screens');
  const offer = usePairingOffer({ open, createSignaller });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="pair-device-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.pairing.title')}</DialogTitle>
          <DialogDescription>{t('settings.pairing.subtitle')}</DialogDescription>
        </DialogHeader>

        {offer.status === 'creating' && (
          <StatusGlyph kind="info" role="status" data-testid="pair-device-gathering">
            {t('settings.pairing.creating')}
          </StatusGlyph>
        )}

        {offer.status === 'failed' && (
          <InlineBanner kind="error" data-testid="pair-device-failed">
            {t('settings.pairing.failed')}
          </InlineBanner>
        )}

        {offer.status === 'ready' && offer.payload !== null && offer.sessionId !== null && (
          <PairingCodeDisplay
            payload={offer.payload}
            sessionId={offer.sessionId}
            kind="offer"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
