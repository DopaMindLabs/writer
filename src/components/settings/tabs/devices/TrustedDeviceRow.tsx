import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TypographyP } from '@/components/ui/typography';
import {
  formatJoinedAt,
  formatLastSeen,
} from '@/components/settings/tabs/cloud/deviceTimestamps';
import type { DeviceLinkState } from '@/lib/writerSyncIntegration/peerLinkStatus';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceLinkBadge } from './TrustedDeviceLinkBadge';
import { TrustedDeviceRowActions } from './TrustedDeviceRowActions';

export interface TrustedDeviceRowProps {
  device: TrustedDeviceEntry;
  onRemove: (deviceId: string) => void;
  /** Absent when this page has had no link to the device — the usual case. */
  linkState?: DeviceLinkState;
  /** Start a fresh pairing exchange. Absent where nothing can offer one. */
  onReconnect?: () => void;
}

/**
 * One paired device.
 *
 * Unlike the cloud registry, a paired device *does* have a name — it arrives
 * from the peer over the authenticated channel. It is presentation only and is
 * rendered as text: it is never part of identity, and a peer that names itself
 * after another device changes nothing about which key verifies its frames.
 *
 * A link that dropped is offered a way back rather than a reassurance. There is
 * no channel left to renegotiate over — signalling happens only through the QR
 * exchange — so the honest remedy is a fresh code on both screens. It is not
 * starting over: trust is already recorded, both devices hold the root secret,
 * and only the transport is rebuilt.
 */
export const TrustedDeviceRow = ({
  device,
  onRemove,
  linkState,
  onReconnect,
}: TrustedDeviceRowProps) => {
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
          {!device.isThisDevice && !device.isRevoked && (
            <TrustedDeviceLinkBadge state={linkState} />
          )}
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
        <TrustedDeviceRowActions
          device={device}
          onRemove={onRemove}
          linkState={linkState}
          onReconnect={onReconnect}
        />
      )}
    </li>
  );
};
