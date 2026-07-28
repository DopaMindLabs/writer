import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PairingCodeDisplay } from '@/components/pairing/PairingCodeDisplay/PairingCodeDisplay';
import { PairingVerification } from '@/components/pairing/PairingVerification/PairingVerification';
import { Button } from '@/components/ui/Button';
import { TypographyMuted } from '@/components/ui/typography';
import type { PairingExchange } from './usePairingExchange';

/**
 * The reading device's step: hand the reply back, then compare the digits.
 *
 * These are two screens rather than one because they are two things the user
 * does, minutes apart in the worst case. This device knows the six digits the
 * moment it has answered — minting the reply is what binds the transcript — but
 * its peer learns them only after reading this code, so showing both at once
 * invites a comparison the other device cannot yet take part in.
 *
 * Moving on is the user's to declare: nothing arrives on this device when the
 * peer reads the code, so there is no event to wait for.
 */

export interface PairingReplyStepProps {
  exchange: PairingExchange;
}

export const PairingReplyStep = ({ exchange }: PairingReplyStepProps) => {
  const { t } = useTranslation('screens');
  const [handedOver, setHandedOver] = useState(false);

  if (
    exchange.answerPayload === null ||
    exchange.sessionId === null ||
    exchange.peer === null
  ) {
    return null;
  }

  if (handedOver) {
    return (
      <PairingVerification
        code={exchange.peer.verificationCode}
        onConfirm={exchange.confirm}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-reply-step">
      <TypographyMuted variant="xs">{t('settings.pairing.replyStep.body')}</TypographyMuted>
      <PairingCodeDisplay
        payload={exchange.answerPayload}
        sessionId={exchange.sessionId}
        kind="answer"
      />
      <Button
        data-testid="pairing-reply-shown"
        onClick={() => {
          setHandedOver(true);
        }}
      >
        {t('settings.pairing.replyStep.done')}
      </Button>
    </div>
  );
};
