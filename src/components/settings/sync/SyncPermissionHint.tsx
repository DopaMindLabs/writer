import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useFolderPermission } from '@/hooks/useSync';
import { requestFolderPermission } from '@/lib/sync/folderSync';

export const SyncPermissionHint = ({
  folderName,
}: {
  folderName: string | null;
}) => {
  const { t } = useTranslation('screens');
  const { lapsed, refresh } = useFolderPermission(folderName);
  const [busy, setBusy] = useState(false);

  if (!lapsed) return null;

  const handleResume = async () => {
    setBusy(true);
    try {
      await requestFolderPermission();
    } finally {
      refresh();
      setBusy(false);
    }
  };

  return (
    <InlineBanner
      kind="warning"
      className="mt-4"
      action={busy ? t('settings.sync.reconnecting') : t('settings.sync.reconnectButton')}
      onAction={() => void handleResume()}
    >
      {t('settings.sync.reconnectHint')}
    </InlineBanner>
  );
};
