import { useTranslation } from 'react-i18next';
import type { PairingRole } from 'writer-sync/pairing';
import { Button } from '@/components/ui/Button';
import { TypographyMuted } from '@/components/ui/typography';

/**
 * Which half of the exchange this device runs.
 *
 * Pairing is not symmetric — one device shows a code and the other reads it —
 * and neither device can work that out for itself without a channel it does not
 * yet have. Asking is the whole of the coordination, so it is asked once, in
 * plain terms, before anything is gathered.
 */

export interface PairingRoleChoiceProps {
  onChoose: (role: PairingRole) => void;
}

export const PairingRoleChoice = ({ onChoose }: PairingRoleChoiceProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex flex-col gap-4" data-testid="pairing-role-choice">
      <div className="flex flex-col gap-1">
        <Button
          data-testid="pairing-role-show"
          onClick={() => {
            onChoose('initiator');
          }}
        >
          {t('settings.pairing.role.show')}
        </Button>
        <TypographyMuted variant="xs">{t('settings.pairing.role.showHint')}</TypographyMuted>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          kind="secondary"
          data-testid="pairing-role-read"
          onClick={() => {
            onChoose('joiner');
          }}
        >
          {t('settings.pairing.role.read')}
        </Button>
        <TypographyMuted variant="xs">{t('settings.pairing.role.readHint')}</TypographyMuted>
      </div>
    </div>
  );
};
