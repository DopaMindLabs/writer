import { useTranslation } from 'react-i18next';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import { Button } from '@/components/ui/Button';

/**
 * The reading device's verification gate, with the way back to its reply.
 *
 * The gate is the shared one; what this adds is the route back. Confirming is
 * single-use, and this screen replaces the reply under a finger that has just
 * pressed something — so the way back is what makes an early press recoverable.
 * It re-shows the reply the device already minted rather than making another:
 * answering is replay-guarded, and a second answer would move the digits the
 * peer is comparing against.
 */

export interface PairingReplyConfirmProps {
  /** Six digits, derived from the transcript. */
  code: string;
  onConfirm: () => void;
  /** Go back to the reply, for a peer that has not read it yet. */
  onShowCode: () => void;
}

export const PairingReplyConfirm = ({
  code,
  onConfirm,
  onShowCode,
}: PairingReplyConfirmProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-reply-verification">
      <PairingVerification code={code} onConfirm={onConfirm} />
      <Button kind="secondary" data-testid="pairing-reply-show-code" onClick={onShowCode}>
        {t('settings.pairing.replyStep.showAction')}
      </Button>
    </div>
  );
};
