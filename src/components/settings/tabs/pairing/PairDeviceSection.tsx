import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { PairDeviceDialog } from '@/components/pairing/PairDeviceDialog/PairDeviceDialog';
import { setJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { useJournalRetention } from '@/lib/writerSyncIntegration/useJournalRetention';
import { JournalRetentionSelector } from './JournalRetentionSelector';

/**
 * The entry point to pairing, in Account settings beside the cloud section.
 *
 * The dialog is mounted only while open, so no peer connection is gathered for a
 * settings screen nobody has asked to pair from.
 */

export const PairDeviceSection = () => {
  const { t } = useTranslation('screens');
  const [open, setOpen] = useState(false);
  const retentionDays = useJournalRetention();

  return (
    <>
      <SettingRow
        data-testid="setting-pair-device"
        label={t('settings.pairing.openLabel')}
        hint={t('settings.pairing.openHint')}
      >
        <Button
          kind="secondary"
          size="sm"
          data-testid="pair-device-open"
          onClick={() => {
            setOpen(true);
          }}
        >
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
      {open && <PairDeviceDialog open={open} onOpenChange={setOpen} />}
    </>
  );
};
