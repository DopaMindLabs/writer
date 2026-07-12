import { useEffect, useState } from 'react';
import { onDocReload } from '@/lib/collab/docReloadChannel';

/**
 * A counter that increments whenever another tab resets this document's CRDT
 * state (e.g. a space backup restore). Feed it into a keyed editor so the editor
 * remounts and reloads the fresh seed instead of keeping a stale `Y.Doc`.
 */
export const useDocReloadNonce = (docId: string): number => {
  const [nonce, setNonce] = useState(0);
  useEffect(
    () => onDocReload(docId, () => { setNonce((n) => n + 1); }),
    [docId],
  );
  return nonce;
};
