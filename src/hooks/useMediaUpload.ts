import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMediaItem, validatePdfFile } from '@/lib/media';

export interface MediaUpload {
  busy: boolean;
  rejected: string[];
  uploadFiles: (files: File[]) => void;
  dismissRejected: () => void;
}

/**
 * Owns the upload side-effect for the media library: validates each picked
 * file through the media facade, adds the accepted ones, and collects
 * per-file rejection messages. Keeps `MediaUploadButton` purely presentational.
 */
export const useMediaUpload = (spaceId: string): MediaUpload => {
  const { t } = useTranslation('screens');
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const uploadFiles = useCallback(
    (files: File[]) => {
      const run = async () => {
        setBusy(true);
        setRejected([]);
        const failures: string[] = [];
        for (const file of files) {
          const result = await validatePdfFile(file);
          if (result.ok) {
            await addMediaItem({ spaceId, name: file.name, blob: file });
          } else {
            failures.push(
              t(`mediaLibrary.upload.reason.${result.reason}`, {
                name: file.name,
              }),
            );
          }
        }
        setRejected(failures);
        setBusy(false);
      };
      void run();
    },
    [spaceId, t],
  );

  const dismissRejected = useCallback(() => {
    setRejected([]);
  }, []);

  return { busy, rejected, uploadFiles, dismissRejected };
};
