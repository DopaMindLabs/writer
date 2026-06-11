import { useState } from 'react';
import type { Backup, Space } from '@/db/schema';
import { errorMessage } from '@/lib/errorMessage';
import { parseSpaceArchive } from '@/lib/format/parseSpaceArchive';
import { restoreSpaceArchive } from '@/lib/format/restoreSpaceArchive';

export interface RestoreBackupController {
  pending: Backup | null;
  busy: boolean;
  error: string | null;
  restored: boolean;
  request: (backup: Backup) => void;
  handleOpenChange: (next: boolean) => void;
  handleConfirm: () => Promise<void>;
}

export const isRestorableBackup = (backup: Backup): boolean =>
  backup.format === 'archive-v2';

export const useRestoreBackup = (space: Space): RestoreBackupController => {
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const request = (backup: Backup) => {
    if (!isRestorableBackup(backup)) return;
    setError(null);
    setRestored(false);
    setPending(backup);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) setPending(null);
  };

  const handleConfirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const archive = await parseSpaceArchive(pending.payload);
      await restoreSpaceArchive(space.id, archive);
      setRestored(true);
      setPending(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { pending, busy, error, restored, request, handleOpenChange, handleConfirm };
};
