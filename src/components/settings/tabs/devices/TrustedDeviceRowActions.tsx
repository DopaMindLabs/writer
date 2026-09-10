import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { DeviceLinkState } from '@/lib/writerSyncIntegration/peerLinkStatus';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';

/**
 * What a row lets you do about one device: bring a dropped link back, or stop
 * trusting the device.
 *
 * Its own surface because these are decisions, while the rest of the row is
 * description — and because both actions are per-device and must say which
 * device they are for out loud, not by their place on screen.
 */

export interface TrustedDeviceRowActionsProps {
  device: TrustedDeviceEntry;
  onRemove: (deviceId: string) => void;
  /** Absent when this page has had no link to the device — the usual case. */
  linkState?: DeviceLinkState;
  /** Start a fresh pairing exchange. Absent where nothing can offer one. */
  onReconnect?: () => void;
}

export const TrustedDeviceRowActions = ({
  device,
  onRemove,
  linkState,
  onReconnect,
}: TrustedDeviceRowActionsProps) => {
  const { t } = useTranslation('screens');
  const k = (key: string) => `settings.devices.list.${key}`;

  // A device only offers a name once it has sent one over the authenticated
  // channel, and a pairing that has not yet is common. "Reconnect " with nothing
  // after it is worse than saying plainly which kind of thing this reconnects.
  const name = device.displayName.trim();
  const reconnectLabel =
    name.length > 0 ? t(k('reconnectLabel'), { name }) : t(k('reconnectUnnamed'));

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* Offered whenever nothing is carrying: a device that dropped and one
          this page never reached both need the same thing, and a row that only
          offered it after a live drop left every reopened page with a paired
          device it could not reach and no way to say so. */}
      {linkState !== 'connected' && linkState !== 'connecting' && onReconnect !== undefined && (
        <Button
          size="sm"
          data-testid={`trusted-device-reconnect-${device.deviceId}`}
          // Named, because a list of several devices offers several of these and
          // "Reconnect" alone tells a screen-reader user nothing about which.
          aria-label={reconnectLabel}
          onClick={onReconnect}
        >
          {t(k('reconnect'))}
        </Button>
      )}
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
    </div>
  );
};
