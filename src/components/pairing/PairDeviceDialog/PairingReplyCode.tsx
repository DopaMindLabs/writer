import { useTranslation } from 'react-i18next';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { Button } from '@/components/ui/Button';
import { TypographyMuted } from '@/components/ui/typography';

/**
 * The reply itself, once the reading device has been asked for it.
 *
 * Shown only on request, which is why it is its own surface: the step this sits
 * inside arrives the instant a scan decodes, and a code rendered there would
 * share a screen with the action that dismisses it.
 *
 * The one action moves on to the digits, because nothing reaches this device
 * when its peer reads the code — the user is the only possible trigger.
 */

export interface PairingReplyCodeProps {
  /** The encoded reply for the peer to read back. */
  payload: string;
  /** Ties every symbol to this session, so a stray scan is recognisable. */
  sessionId: string;
  /** The peer has read the reply; move on to comparing the digits. */
  onHandOver: () => void;
}

export const PairingReplyCode = ({
  payload,
  sessionId,
  onHandOver,
}: PairingReplyCodeProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-reply-code">
      <TypographyMuted variant="xs">{t('settings.pairing.replyStep.body')}</TypographyMuted>
      <PairingCodeDisplay payload={payload} sessionId={sessionId} kind="answer" />
      <Button data-testid="pairing-reply-shown" onClick={onHandOver}>
        {t('settings.pairing.replyStep.done')}
      </Button>
    </div>
  );
};
