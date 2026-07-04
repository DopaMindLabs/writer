/**
 * A process-local registry of mounted collaborative editors, keyed by document
 * id. Restore flows use it to push a new body through the *live* editor (so the
 * change flows into the CRDT binding and is persisted + broadcast) instead of
 * remounting the component. Only mounted documents have a handle.
 */
export interface EditorHandle {
  restoreBody: (serialized: string) => void;
  /**
   * Flush any pending autosave synchronously, returning `true` if there were
   * unsaved local edits to write. Cloud reconciliation uses this to tell a
   * genuine remote pull from same-device autosave lag before restoring: if a
   * flush wrote, the row was merely stale, not pulled. Optional — a handle
   * without it reports no pending edits.
   */
  flush?: () => boolean;
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
