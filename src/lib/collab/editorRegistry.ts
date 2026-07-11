import type { FlushResult } from './flush.types';

/**
 * A process-local registry of mounted collaborative editors, keyed by document
 * id. Restore flows use it to push a new body through the *live* editor (so the
 * change flows into the CRDT binding and is persisted + broadcast) instead of
 * remounting the component. Only mounted documents have a handle.
 */
export interface EditorHandle {
  restoreBody: (serialized: string) => void;
  /**
   * Flush any pending autosave, resolving once the write has landed with a
   * {@link FlushResult} describing whether anything was persisted and which body.
   * Cloud reconciliation awaits this: a flush that wrote reports the exact local
   * body, so the reconciler can preserve the just-pulled remote body as a safety
   * revision before the local body replaces it, rather than losing either side.
   * Optional — a handle without it reports no pending edits.
   */
  flush?: () => Promise<FlushResult>;
}

const handles = new Map<string, EditorHandle>();

/** Register a mounted editor's handle; returns an unregister cleanup. */
export const registerEditorHandle = (
  docId: string,
  handle: EditorHandle,
): (() => void) => {
  handles.set(docId, handle);
  return () => {
    // Only drop the entry if it is still ours — a remount may have replaced it.
    if (handles.get(docId) === handle) handles.delete(docId);
  };
};

export const getEditorHandle = (docId: string): EditorHandle | undefined =>
  handles.get(docId);

/**
 * The ids of currently-mounted documents, as a copied snapshot (never the live
 * map). Cloud reconciliation processes these first so the document the user is
 * looking at converges before any background sweep of the rest of the library.
 */
export const mountedDocIds = (): string[] => Array.from(handles.keys());
