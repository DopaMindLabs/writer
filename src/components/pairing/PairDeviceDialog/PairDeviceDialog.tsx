import { useTranslation } from 'react-i18next';
import type { QrScanner } from 'writer-qr/scan';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PairDeviceDialogBody } from './PairDeviceDialogBody';
import { usePairingExchange, type UsePairingExchangeOptions } from './usePairingExchange';

/**
 * Pairing, from this device's side: gather an offer, show it, read the other
 * device's reply, then hold at the verification gate until a human confirms the
 * codes match.
 *
 * Gathering starts when the dialog opens and stops when it closes, so nothing is
 * held open in the background. The code shown here carries no secret — no
 * passphrase, recovery code, account root or content key ever rides a QR payload
 * (runbook §17) — which is why it is safe to display before any device has been
 * confirmed.
 */

export interface PairDeviceDialogProps
  extends Pick<UsePairingExchangeOptions, 'createSignaller'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Injected in tests and stories; defaults to the real detector. */
  scanner?: QrScanner;
}

export const PairDeviceDialog = ({
  open,
  onOpenChange,
  createSignaller,
  scanner,
}: PairDeviceDialogProps) => {
  const { t } = useTranslation('screens');
  const exchange = usePairingExchange({ open, createSignaller });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="pair-device-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.pairing.title')}</DialogTitle>
          <DialogDescription>{t('settings.pairing.subtitle')}</DialogDescription>
        </DialogHeader>
        <PairDeviceDialogBody exchange={exchange} scanner={scanner} />
      </DialogContent>
    </Dialog>
  );
};
