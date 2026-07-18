import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TypographyP } from '@/components/ui/typography';
import { CloudDeviceListRow } from './CloudDeviceListRow';
import { useDeviceList } from './useDeviceList';
import { useDeviceRemoval } from './useDeviceRemoval';

export interface CloudDeviceListProps {
  onSignOut: () => void;
}

/**
 * The account's devices, with a way to free a slot from whichever device the user
 * happens to be on.
 *
 * That last part is the point. Until now the only way to free a slot was to sign
 * out *on the device holding it* — useless for the case that actually bites, a
 * laptop that was wiped or given away. Four of those and the account is locked out
 * of cloud sync entirely.
 */
export const CloudDeviceList = ({ onSignOut }: CloudDeviceListProps) => {
  const { t } = useTranslation('screens');
  const key = (name: string) => `settings.account.cloud.devices.${name}`;
  const list = useDeviceList();
  const removal = useDeviceRemoval();

  // Undefined while the live query resolves: render nothing rather than flashing
  // an empty state over a registry that is about to arrive.
  if (!list) return null;

  return (
    <section className="mt-6" data-testid="cloud-device-list">
      <SectionLabel>{t(key('title'))}</SectionLabel>
      {list.entries.length === 0 ? (
        <EmptyState className="mt-2" caption={t(key('empty'))} />
      ) : (
        <>
          <TypographyP variant="caption" className="mt-1">
            {t(key('count'), { used: list.used, limit: list.limit })}
          </TypographyP>
          <ul className="mt-2">
            {list.entries.map((device, index) => (
              <CloudDeviceListRow
                key={device.id}
                device={device}
                number={index + 1}
                onSignOut={onSignOut}
                onRevoke={removal.ask}
              />
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={removal.pending !== null}
        onOpenChange={(open) => {
          if (!open) removal.cancel();
        }}
        title={t(key('revokeTitle'))}
        description={t(key('revokeBody'))}
        confirmLabel={t(key('revokeConfirm'))}
        cancelLabel={t(key('revokeCancel'))}
        confirmKind="dangerous"
        onConfirm={removal.confirm}
      />
    </section>
  );
};
