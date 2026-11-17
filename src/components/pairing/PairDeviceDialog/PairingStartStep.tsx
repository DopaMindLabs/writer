import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TypographyMuted } from '@/components/ui/typography';

/**
 * The choice that opens the dialog: show a code, or scan the other device's.
 *
 * Purely presentational — it decides what this screen displays, never which
 * protocol half runs. Roles are still settled by whatever payload arrives
 * (`resolvePairingRole`), so picking "show" on both devices costs nothing but
 * a tap, and neither button commits the exchange to anything.
 *
 * What it removes is the two-codes problem: a dialog that opens straight into
 * a code on both devices reads as two flows running at once, with no clue
 * which device is meant to be doing which.
 */

export interface PairingStartStepProps {
  /** Show this device's code. */
  onShow: () => void;
  /** Open the scanner for the other device's code. */
  onScan: () => void;
}

export const PairingStartStep = ({ onShow, onScan }: PairingStartStepProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-start-step">
      <TypographyMuted variant="xs">{t('settings.pairing.startStep.body')}</TypographyMuted>
      <Button data-testid="pairing-start-show" onClick={onShow}>
        {t('settings.pairing.startStep.showAction')}
      </Button>
      <Button kind="secondary" data-testid="pairing-start-scan" onClick={onScan}>
        {t('settings.pairing.startStep.scanAction')}
      </Button>
    </div>
  );
};
