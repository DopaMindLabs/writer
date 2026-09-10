import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * The confirmation gate: both devices show six digits derived from the pairing
 * transcript, and the user says whether they match.
 *
 * This is the step that defeats the strongest attack the protocol faces — an
 * observer who photographs the offer and races the legitimate joiner. A
 * substituted payload gives the two ends different transcripts and therefore
 * different codes, so the mismatch is visible to a person even though neither
 * device can tell on its own.
 *
 * The code is derived, never transmitted, and never entered: nothing here asks
 * the user to type it, because a field to type it into is a field an attacker
 * can ask them to fill.
 */

export interface PairingVerificationProps {
  /** Six digits, derived from the transcript. */
  code: string;
  onConfirm: () => void;
}

export const PairingVerification = ({ code, onConfirm }: PairingVerificationProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-verification">
      <InlineBanner kind="warning" title={t('settings.pairing.confirm.title')}>
        {t('settings.pairing.confirm.body')}
      </InlineBanner>
      <p
        data-testid="pairing-verification-code"
        aria-label={t('settings.pairing.confirm.codeLabel')}
        className="text-center font-mono text-[32px] tracking-[0.2em] text-ink"
      >
        {code}
      </p>
      <p className="text-caption text-ink-2">{t('settings.pairing.confirm.mismatch')}</p>
      <Button data-testid="pairing-verification-confirm" onClick={onConfirm}>
        {t('settings.pairing.confirm.action')}
      </Button>
    </div>
  );
};
