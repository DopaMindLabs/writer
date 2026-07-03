/**
 * A process-local registry of mounted collaborative editors, keyed by document
 * id. Restore flows use it to push a new body through the *live* editor (so the
 * change flows into the CRDT binding and is persisted + broadcast) instead of
 * remounting the component. Only mounted documents have a handle.
 */
export interface EditorHandle {
  restoreBody: (serialized: string) => void;
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
