import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
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
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-ink bg-paper-2/60 px-4 py-3"
    >
      <p className="max-w-[520px] font-serif text-[13px] italic text-ink-2">
        {t('settings.sync.reconnectHint')}
      </p>
      <Button size="sm" onClick={() => void handleResume()} disabled={busy}>
        {busy ? t('settings.sync.syncing') : t('settings.sync.reconnectButton')}
      </Button>
    </div>
  );
};
