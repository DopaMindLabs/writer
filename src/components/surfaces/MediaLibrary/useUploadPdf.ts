import { useState } from 'react';
import { addMediaItem, validatePdfFile } from '@/lib/media';

export interface UploadPdf {
  error: string | null;
  busy: boolean;
  upload: (files: File[]) => Promise<void>;
}

export const useUploadPdf = (
  spaceId: string,
  onUploaded?: (mediaItemId: string) => void,
): UploadPdf => {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    const [file] = files;
    setBusy(true);
    setError(null);
    try {
      const result = await validatePdfFile(file);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const blob = new Blob([await file.arrayBuffer()], {
        type: 'application/pdf',
      });
      const item = await addMediaItem(spaceId, file.name, blob);
      onUploaded?.(item.id);
    } catch (e) {
      console.error('useUploadPdf: upload failed', e);
      setError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return { error, busy, upload };
};
