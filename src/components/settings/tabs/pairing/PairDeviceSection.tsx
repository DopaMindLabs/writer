import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { setJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { useJournalRetention } from '@/lib/writerSyncIntegration/useJournalRetention';
import { JournalRetentionSelector } from './JournalRetentionSelector';

/**
 * The settings rows that lead into pairing: the way in, and how long sync
 * history is kept.
 *
 * It asks for the dialog rather than holding it. The tab is where a device list
 * also offers to re-pair a device that dropped, and two owners of the same
 * dialog would be two dialogs — so ownership sits one level up, and this stays
 * presentational.
 */

export interface PairDeviceSectionProps {
  /** Open the pairing dialog, which the tab owns. */
  onPair: () => void;
}

export const PairDeviceSection = ({ onPair }: PairDeviceSectionProps) => {
  const { t } = useTranslation('screens');
  const retentionDays = useJournalRetention();

  return (
    <>
      <SettingRow
        data-testid="setting-pair-device"
        label={t('settings.pairing.openLabel')}
        hint={t('settings.pairing.openHint')}
      >
        <Button kind="secondary" size="sm" data-testid="pair-device-open" onClick={onPair}>
          {t('settings.pairing.openLabel')}
        </Button>
      </SettingRow>
      <SettingRow
        data-testid="setting-journal-retention"
        label={t('settings.pairing.retention.label')}
        hint={t('settings.pairing.retention.hint')}
      >
        <JournalRetentionSelector
          value={retentionDays}
          onChange={(days) => {
            void setJournalRetentionDays(days);
          }}
          ariaLabel={t('settings.pairing.retention.label')}
        />
      </SettingRow>
    </>
  );
};
