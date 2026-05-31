import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useFolderPermission } from '@/hooks/useSync';
import { requestFolderPermission } from '@/lib/sync/folderSync';

// Shown in the Sync tabs when a folder is connected but write permission has
// lapsed for this session (e.g. after a reload). Re-granting permission from
// this click resumes manual and scheduled auto-sync.
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
      action={busy ? t('settings.sync.syncing') : t('settings.sync.reconnectButton')}
      onAction={() => void handleResume()}
    >
      {t('settings.sync.reconnectHint')}
    </InlineBanner>
  );
};
