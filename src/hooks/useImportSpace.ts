import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errorMessage';
import { parseSpaceArchive } from '@/lib/format/parseSpaceArchive';
import { importSpaceArchive } from '@/lib/format/importSpaceArchive';

export interface ImportSpaceController {
  busy: boolean;
  error: string | null;
  importFile: (file: File) => Promise<void>;
}

export const useImportSpace = (): ImportSpaceController => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFile = async (file: File) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const archive = await parseSpaceArchive(file);
      const { spaceId } = await importSpaceArchive(archive);
      await navigate(routes.spaceWrite(spaceId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, importFile };
};
