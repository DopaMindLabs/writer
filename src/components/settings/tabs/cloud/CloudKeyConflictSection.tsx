import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { CloudKeyConflictDialog } from './CloudKeyConflictDialog';

export interface CloudKeyConflictSectionProps {
  onResolved: () => void;
}

/**
 * The key-conflict notice and its resolution dialog, shown while this device's
 * key mismatches the account's. The parent decides when to mount it (on the
 * mismatch signal), so this stays a plain presentational surface.
 */
export const CloudKeyConflictSection = ({
  onResolved,
}: CloudKeyConflictSectionProps) => {
  const { t } = useTranslation('screens');
  const k = (name: string) => t(`settings.cloud.conflict.${name}`);
  const [open, setOpen] = useState(false);
  return (
    <>
      <InlineBanner
        kind="warning"
        className="mt-4"
        title={k('bannerTitle')}
        action={k('bannerAction')}
        onAction={() => {
          setOpen(true);
        }}
      >
        {k('bannerBody')}
      </InlineBanner>
      <CloudKeyConflictDialog
        open={open}
        onOpenChange={setOpen}
        onResolved={onResolved}
      />
    </>
  );
};
