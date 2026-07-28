import { TabHeader } from '@/components/settings/TabHeader';
import { db } from '@/db/db';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { useTrustedDevices } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { asDeviceId } from 'writer-sync/core';
import { PairDeviceSection } from './pairing/PairDeviceSection';
import { TrustedDeviceList } from './devices/TrustedDeviceList';

/**
 * Keeping your writing the same across your devices.
 *
 * Named for the job rather than the objects, and kept distinct from the folder
 * sync tab beside it: both are sync, and the difference is *where to*. One
 * word covering both would make "sync failed" mean two unrelated things.
 *
 * It sits in the data group because that is where the ways writing moves around
 * live — backups, folder sync, export. Pairing is scoped to the account, but a
 * device list is not profile settings.
 */
export const DeviceSyncTab = () => {
  const devices = useTrustedDevices();

  const remove = (deviceId: string): void => {
    void createTrustedDeviceStore(db).revoke({
      deviceId: asDeviceId(deviceId),
      at: Date.now(),
    });
  };

  return (
    <>
      <TabHeader
        titleKey="settings.devices.title"
        subtitleKey="settings.devices.subtitle"
      />
      <TrustedDeviceList devices={devices} onRemove={remove} />
      <PairDeviceSection />
    </>
  );
};
