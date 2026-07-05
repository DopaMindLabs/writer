import { useCallback, useEffect, useState } from 'react';
import { ensurePdfWorker } from '@/lib/pdf/pdfWorker';
import { usePdfDocument } from '@/hooks/usePdfDocument';

export interface PdfLoad {
  status: 'loading' | 'error' | 'ready';
  file: { data: Uint8Array } | null;
  onLoadSuccess: (pages: number) => void;
  onLoadError: () => void;
  retry: () => void;
}

/**
 * The document load lifecycle: bytes (via `usePdfDocument`), worker setup, and a
 * document-level parse error separate from the byte-read error. `retry`
 * re-copies the retained bytes and re-parses. Kept apart from the viewport's
 * page/zoom state so each concern changes for one reason.
 *
 * @param onLoaded called with the page count on a successful parse.
 */
export const usePdfLoad = (blob: Blob, onLoaded: (pages: number) => void): PdfLoad => {
  const { state, reload } = usePdfDocument(blob);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    ensurePdfWorker();
  }, []);

  const onLoadSuccess = useCallback(
    (pages: number) => {
      onLoaded(pages);
      setLoadError(false);
    },
    [onLoaded],
  );

  const onLoadError = useCallback(() => {
    setLoadError(true);
  }, []);

  const retry = useCallback(() => {
    setLoadError(false);
    reload();
  }, [reload]);

  const status: PdfLoad['status'] =
    loadError || state.status === 'error'
      ? 'error'
      : state.status === 'ready'
        ? 'ready'
        : 'loading';

  return {
    status,
    file: state.status === 'ready' ? state.file : null,
    onLoadSuccess,
    onLoadError,
    retry,
  };
};
