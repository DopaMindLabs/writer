import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { DeviceLinkState } from '@/lib/writerSyncIntegration/peerLinkStatus';

/**
 * Whether this device is connected to that one, right now.
 *
 * Every row says where it stands, including the resting state. A device with no
 * link is the ordinary case — sessions are made by the pairing exchange and
 * survive no reload — and a list that showed nothing left a paired device
 * looking ready to sync when nothing could reach it.
 *
 * The resting state is stated, not warned about: *not connected* after a reload
 * is normal, while *disconnected* means a link that was carrying work stopped
 * during this page's life. Same fact, different news, so they read differently.
 */

export interface TrustedDeviceLinkBadgeProps {
  /** Absent when this page has never had a link to the device. */
  state?: DeviceLinkState;
}

const KIND = {
  connected: 'success',
  connecting: 'info',
  dropped: 'warning',
  idle: 'info',
} as const;

const LABEL = {
  connected: 'linkConnected',
  connecting: 'linkConnecting',
  dropped: 'linkDropped',
  idle: 'linkIdle',
} as const;

export const TrustedDeviceLinkBadge = ({ state }: TrustedDeviceLinkBadgeProps) => {
  const { t } = useTranslation('screens');
  const shown = state ?? 'idle';

  return (
    <StatusBadge
      kind={KIND[shown]}
      // No glyph at rest: an icon on a state nothing is wrong with reads as a
      // status report on a device that is simply idle.
      glyph={shown !== 'idle'}
      data-testid={`device-link-${shown}`}
    >
      {t(`settings.devices.list.${LABEL[shown]}`)}
    </StatusBadge>
  );
};
