import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TypographyMuted } from '@/components/ui/typography';
import { PairingReplyCode } from './PairingReplyCode';
import { PairingReplyConfirm } from './PairingReplyConfirm';
import type { PairingExchange } from './usePairingExchange';

/**
 * The reading device's step: hand the reply back, then compare the digits.
 *
 * These are separate screens rather than one because they are separate things
 * the user does, minutes apart in the worst case. This device knows the six
 * digits the moment it has answered — minting the reply is what binds the
 * transcript — but its peer learns them only after reading this code, so showing
 * both at once invites a comparison the other device cannot yet take part in.
 *
 * Each screen also arrives under a finger that has just pressed something: the
 * first replaces the scanner the instant a payload decodes, and the digits
 * replace the reply. So the reply waits behind a reveal, and the digits keep a
 * way back to it. A reply pressed past is otherwise gone — it cannot be minted
 * again (answering is replay-guarded, and a second answer would move the digits)
 * — which cost both devices the whole exchange.
 *
 * Moving on is the user's to declare: nothing arrives on this device when the
 * peer reads the code, so there is no event to wait for.
 */

/** Which of the three things this step shows; the reply is never the first. */
type ReplyScreen = 'hidden' | 'code' | 'digits';

export interface PairingReplyStepProps {
  exchange: PairingExchange;
}

export const PairingReplyStep = ({ exchange }: PairingReplyStepProps) => {
  const { t } = useTranslation('screens');
  const [screen, setScreen] = useState<ReplyScreen>('hidden');

  if (
    exchange.answerPayload === null ||
    exchange.sessionId === null ||
    exchange.peer === null
  ) {
    return null;
  }

  if (screen === 'digits') {
    return (
      <PairingReplyConfirm
        code={exchange.peer.verificationCode}
        onConfirm={exchange.confirm}
        onShowCode={() => {
          setScreen('code');
        }}
      />
    );
  }

  if (screen === 'code') {
    return (
      <PairingReplyCode
        payload={exchange.answerPayload}
        sessionId={exchange.sessionId}
        onHandOver={() => {
          setScreen('digits');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-reply-step">
      <TypographyMuted variant="xs">{t('settings.pairing.replyStep.body')}</TypographyMuted>
      <Button
        data-testid="pairing-reply-reveal"
        onClick={() => {
          setScreen('code');
        }}
      >
        {t('settings.pairing.replyStep.revealAction')}
      </Button>
    </div>
  );
};
