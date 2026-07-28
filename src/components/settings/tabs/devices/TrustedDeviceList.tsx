import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineBanner } from '@/components/ui/InlineBanner';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceRow } from './TrustedDeviceRow';

export interface TrustedDeviceListProps {
  /** `undefined` while the first read is in flight. */
  devices: TrustedDeviceEntry[] | undefined;
  onRemove: (deviceId: string) => void;
}

/**
 * The devices this account has paired with.
 *
 * The note about what removal cannot do is permanent rather than shown on
 * removal. A user deciding whether to remove a device needs it *before* they
 * act, and a confirmation dialog that admitted the limitation only at the last
 * moment would be telling them too late to matter.
 */
export const TrustedDeviceList = ({ devices, onRemove }: TrustedDeviceListProps) => {
  const { t } = useTranslation('screens');
  const k = (key: string) => t(`settings.devices.list.${key}`);

  if (devices === undefined) return null;

  if (devices.length === 0) {
    return <EmptyState data-testid="trusted-devices-empty" caption={k('empty')} />;
  }

  return (
    <div className="flex flex-col gap-3" data-testid="trusted-devices">
      <ul className="border-t border-rule">
        {devices.map((device) => (
          <TrustedDeviceRow key={device.deviceId} device={device} onRemove={onRemove} />
        ))}
      </ul>
      <InlineBanner kind="info" data-testid="trusted-devices-removal-note">
        {k('removalLimitation')}
      </InlineBanner>
    </div>
  );
};
