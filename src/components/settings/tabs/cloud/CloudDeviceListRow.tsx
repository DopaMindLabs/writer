import { useTranslation } from 'react-i18next';
import { TypographyP } from '@/components/ui/typography';
import { CloudDeviceAction } from './CloudDeviceAction';
import { CloudDeviceBadges } from './CloudDeviceBadges';
import { formatJoinedAt, formatLastSeen } from './deviceTimestamps';
import type { DeviceListEntry } from './useDeviceList';

export interface CloudDeviceListRowProps {
  device: DeviceListEntry;
  /** 1-based, by join order — the only stable name a row can have (see below). */
  number: number;
  onSignOut: () => void;
  onFreeSlot: (id: string) => void;
}

/**
 * One device in the account's list.
 *
 * A device has no name to show. The registry row deliberately carries nothing but
 * an opaque client identity and two timestamps — no device name, no user agent —
 * so the server learns nothing from it. The join order is therefore the only handle
 * a user can be given, and the joined/last-seen line is what actually tells them
 * which machine this is.
 */
export const CloudDeviceListRow = ({
  device,
  number,
  onSignOut,
  onFreeSlot,
}: CloudDeviceListRowProps) => {
  const { t, i18n } = useTranslation('screens');
  const k = (key: string) => `settings.account.cloud.devices.${key}`;

  const name = device.isThisDevice
    ? t(k('thisDevice'))
    : t(k('deviceLabel'), { number });

  return (
    <li
      data-testid={`cloud-device-${device.id}`}
      data-this-device={device.isThisDevice ? 'true' : undefined}
      data-stale={device.isStale ? 'true' : undefined}
      className="flex items-center justify-between gap-4 border-b border-rule py-3 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] text-ink">{name}</span>
          <CloudDeviceBadges
            isThisDevice={device.isThisDevice}
            isStale={device.isStale}
          />
        </div>
        <TypographyP variant="caption" className="mt-0.5">
          {t(k('joined'), { date: formatJoinedAt(device.joinedAt, i18n.language) })}
          {' · '}
          {t(k('lastSeen'), {
            when: formatLastSeen(device.lastSeenAt, Date.now(), i18n.language),
          })}
        </TypographyP>
      </div>
      <CloudDeviceAction
        isThisDevice={device.isThisDevice}
        name={name}
        onSignOut={onSignOut}
        onFreeSlot={() => {
          onFreeSlot(device.id);
        }}
      />
    </li>
  );
};
