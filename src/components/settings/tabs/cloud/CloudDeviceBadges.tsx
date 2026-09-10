import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface CloudDeviceBadgesProps {
  isThisDevice: boolean;
  isStale: boolean;
}

/**
 * The state of one device slot: which row is the machine in front of the user, and
 * which rows are already free for the taking. `StatusBadge` is the primitive whose
 * documented use is exactly this — row state.
 */
export const CloudDeviceBadges = ({
  isThisDevice,
  isStale,
}: CloudDeviceBadgesProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.devices.${name}`);
  return (
    <>
      {isThisDevice ? (
        <StatusBadge kind="success" data-testid="cloud-device-badge-current">
          {k('thisDeviceBadge')}
        </StatusBadge>
      ) : null}
      {isStale ? (
        <StatusBadge kind="warning" data-testid="cloud-device-badge-stale">
          {k('inactiveBadge')}
        </StatusBadge>
      ) : null}
    </>
  );
};
