import { useEffect, useState } from 'react';
import { parseSafeVectorBlob, type SafeVectorDocumentV1 } from 'writer-notebook/core';

interface SafeVectorState {
  readonly document: SafeVectorDocumentV1 | null;
  readonly invalid: boolean;
}

const EMPTY_STATE: SafeVectorState = { document: null, invalid: false };

export const useSafeVectorDocument = (blob: Blob | undefined): SafeVectorState => {
  const [state, setState] = useState<SafeVectorState>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;
    setState(EMPTY_STATE);
    if (!blob) return () => { cancelled = true; };
    void parseSafeVectorBlob(blob)
      .then((document) => { if (!cancelled) setState({ document, invalid: false }); })
      .catch(() => { if (!cancelled) setState({ document: null, invalid: true }); });
    return () => { cancelled = true; };
  }, [blob]);

  return state;
};
