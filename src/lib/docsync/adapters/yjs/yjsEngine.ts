import * as Y from 'yjs';
import { invariant } from '@/lib/invariant';
import type {
  DocSyncEngine,
  EditorBindingHandle,
  EngineDoc,
} from '@/lib/docsync/ports';

const toHandle = (doc: Y.Doc): EditorBindingHandle =>
  doc as unknown as EditorBindingHandle;

/**
 * Narrows the opaque handle back to the vendor document. Only the Yjs editor
 * binding (`src/editor/collab/yjs`) may call this — it is the one validated
 * boundary where the vendor type re-emerges.
 */
export const docFromHandle = (handle: EditorBindingHandle): Y.Doc => {
  invariant(
    handle instanceof Y.Doc,
    'editor binding handle was not produced by the Yjs engine',
  );
  return handle;
};

const openDoc = (updates: readonly Uint8Array[]): EngineDoc => {
  const doc = new Y.Doc();
  for (const update of updates) {
    Y.applyUpdate(doc, update);
  }
  return {
    handle: toHandle(doc),
    encodeSnapshot: () => Y.encodeStateAsUpdate(doc),
    onUpdate: (listener) => {
      const forward = (update: Uint8Array) => {
        listener(update);
      };
      doc.on('update', forward);
      return () => {
        doc.off('update', forward);
      };
    },
    destroy: () => {
      doc.destroy();
    },
  };
};

/** `DocSyncEngine` adapter backed by Yjs. */
export const yjsEngine: DocSyncEngine = { open: openDoc };
