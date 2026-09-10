import { useState } from 'react';
import { TabHeader } from '@/components/settings/TabHeader';
import { PairDeviceDialog } from '@/components/pairing/PairDeviceDialog/PairDeviceDialog';
import { db } from '@/db/db';
import { usePeerLinkStates } from '@/hooks/usePeerLinkStates';
import { removeTrustedDevice } from '@/lib/writerSyncIntegration/removeTrustedDevice';
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
 *
 * The pairing dialog is owned here rather than by the row that opens it, because
 * two surfaces ask for it: the section below, and a device in the list that has
 * dropped and offers to re-pair. It is mounted only while open, so no peer
 * connection is gathered for a settings screen nobody has asked to pair from.
 */
export const DeviceSyncTab = () => {
  const devices = useTrustedDevices();
  const links = usePeerLinkStates();
  const [pairing, setPairing] = useState(false);

  const remove = (deviceId: string): void => {
    // Removal is also what releases the deletion state that was only being kept
    // for this device, so it goes through the one operation that does both.
    void removeTrustedDevice({ db, deviceId: asDeviceId(deviceId) });
  };

  const pair = (): void => {
    setPairing(true);
  };

  return (
    <>
      <TabHeader
        titleKey="settings.devices.title"
        subtitleKey="settings.devices.subtitle"
      />
      <TrustedDeviceList
        devices={devices}
        onRemove={remove}
        links={links}
        onReconnect={pair}
      />
      <PairDeviceSection onPair={pair} />
      {pairing && <PairDeviceDialog open onOpenChange={setPairing} />}
    </>
  );
};
