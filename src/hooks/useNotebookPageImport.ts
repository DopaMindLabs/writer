import { useState } from 'react';
import { processPageImage } from 'writer-notebook/browser';
import { errorMessage } from '@/lib/errorMessage';
import { createWriterNotebookSdk, WRITER_NOTEBOOK_LIMITS } from '@/lib/writerNotebookIntegration';

const PAGE_IMAGE_LIMITS = {
  maxSourceBytes: WRITER_NOTEBOOK_LIMITS.maxSourceBytes,
  maxThumbnailBytes: WRITER_NOTEBOOK_LIMITS.maxThumbnailBytes,
  maxDecodedPixels: WRITER_NOTEBOOK_LIMITS.maxDecodedPixels,
  maxImageDimension: WRITER_NOTEBOOK_LIMITS.maxImageDimension,
};

export const useNotebookPageImport = (spaceId: string, notebookId: string) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = async (files: readonly File[]): Promise<void> => {
    const sdk = createWriterNotebookSdk(spaceId);
    const existing = await sdk.listPages(notebookId);
    const remaining = WRITER_NOTEBOOK_LIMITS.maxPagesPerNotebook - existing.length;
    if (remaining <= 0) throw new RangeError('Notebook page limit reached');
    for (const file of files.slice(0, remaining)) {
      const processed = await processPageImage(file, { limits: PAGE_IMAGE_LIMITS });
      await sdk.addPage({
        notebookId,
        source: { mime: processed.source.mime, blob: processed.source.blob },
        thumbnail: { mime: processed.thumbnail.mime, blob: processed.thumbnail.blob },
        width: processed.source.width,
        height: processed.source.height,
      });
    }
  };

  const importFiles = (files: File[]): void => {
    if (processing || files.length === 0) return;
    setProcessing(true);
    setError(null);
    // File input handlers are synchronous; the hook owns completion and visible failure state.
    void processFiles(files)
      .catch((cause: unknown) => { setError(errorMessage(cause)); })
      .finally(() => { setProcessing(false); });
  };

  return { processing, error, importFiles };
};
