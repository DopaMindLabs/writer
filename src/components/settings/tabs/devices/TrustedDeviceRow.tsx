import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TypographyP } from '@/components/ui/typography';
import {
  formatJoinedAt,
  formatLastSeen,
} from '@/components/settings/tabs/cloud/deviceTimestamps';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';

export interface TrustedDeviceRowProps {
  device: TrustedDeviceEntry;
  onRemove: (deviceId: string) => void;
}

/**
 * One paired device.
 *
 * Unlike the cloud registry, a paired device *does* have a name — it arrives
 * from the peer over the authenticated channel. It is presentation only and is
 * rendered as text: it is never part of identity, and a peer that names itself
 * after another device changes nothing about which key verifies its frames.
 */
export const TrustedDeviceRow = ({ device, onRemove }: TrustedDeviceRowProps) => {
  const { t, i18n } = useTranslation('screens');
  const k = (key: string) => `settings.devices.list.${key}`;

  return (
    <li
      data-testid={`trusted-device-${device.deviceId}`}
      data-this-device={device.isThisDevice ? 'true' : undefined}
      data-revoked={device.isRevoked ? 'true' : undefined}
      className="flex items-center justify-between gap-4 border-b border-rule py-3 last:border-b-0"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] text-ink">{device.displayName}</span>
          {device.isThisDevice && <StatusBadge kind="info">{t(k('thisDevice'))}</StatusBadge>}
          {device.isRevoked && <StatusBadge kind="warning">{t(k('removed'))}</StatusBadge>}
        </div>
        <TypographyP variant="caption" className="mt-0.5">
          {t(k('added'), { date: formatJoinedAt(device.addedAt, i18n.language) })}
          {' · '}
          {device.lastSessionAt === undefined
            ? t(k('neverConnected'))
            : t(k('lastConnected'), {
                when: formatLastSeen(device.lastSessionAt, Date.now(), i18n.language),
              })}
        </TypographyP>
      </div>
      {!device.isThisDevice && !device.isRevoked && (
        <Button
          kind="secondary"
          size="sm"
          data-testid={`trusted-device-remove-${device.deviceId}`}
          onClick={() => {
            onRemove(device.deviceId);
          }}
        >
          {t(k('remove'))}
        </Button>
      )}
    </li>
  );
};
