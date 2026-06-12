import { useEffect, useState } from 'react';
import { openDocSyncSession, type DocSyncDeps } from '@/lib/docsync/docBodyStore';
import type { DocSyncSession } from '@/lib/docsync/ports';

/**
 * Lifecycle wrapper that opens a {@link DocSyncSession} for `(docId, nonce)`
 * and closes it on unmount. The session is null while opening; consumers
 * gate render on it. Bumping `nonce` (via the restore flow) discards the
 * current session and opens a fresh one.
 */
export const useDocSyncSession = (
  docId: string,
  nonce: number,
  deps?: DocSyncDeps,
): DocSyncSession | null => {
  const [session, setSession] = useState<DocSyncSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    let opened: DocSyncSession | null = null;
    openDocSyncSession(docId, deps)
      .then((s) => {
        if (cancelled) {
          s.close();
          return;
        }
        opened = s;
        setSession(s);
      })
      .catch((err: unknown) => {
        console.error(`Failed to open doc sync session for ${docId}`, err);
      });
    return () => {
      cancelled = true;
      if (opened) opened.close();
      setSession(null);
    };
  }, [docId, nonce, deps]);

  return session;
};
