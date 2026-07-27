import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { PairDeviceDialog } from '@/components/pairing/PairDeviceDialog/PairDeviceDialog';

/**
 * The entry point to pairing, in Account settings beside the cloud section.
 *
 * The dialog is mounted only while open, so no peer connection is gathered for a
 * settings screen nobody has asked to pair from.
 */

export const PairDeviceSection = () => {
  const { t } = useTranslation('screens');
  const [open, setOpen] = useState(false);

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
      {open && <PairDeviceDialog open={open} onOpenChange={setOpen} />}
    </>
  );
};
