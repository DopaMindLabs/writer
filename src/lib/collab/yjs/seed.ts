import * as Y from 'yjs';
import { createHeadlessEditor } from '@lexical/headless';
import { createBinding, syncLexicalUpdateToYjs } from '@lexical/yjs';
import type { Provider } from '@lexical/yjs';
import { EDITOR_NODES } from '@/editor/nodes';

/**
 * A no-op {@link Provider} satisfying `@lexical/yjs`'s contract. Seeding runs the
 * binding in isolation — no awareness, no network — so every method is inert.
 */
const createStubProvider = (): Provider => ({
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    on: () => undefined,
    off: () => undefined,
    setLocalState: () => undefined,
    setLocalStateField: () => undefined,
  },
  connect: () => undefined,
  disconnect: () => undefined,
  on: () => undefined,
  off: () => undefined,
});

/**
 * Encode serialized Lexical JSON as the initial Yjs update for a document — the
 * CRDT seed planted at creation. A headless editor bound to a fresh `Y.Doc` is
 * set to the serialized state; the resulting Lexical update is synced into the
 * doc, which is then returned as a single encoded update.
 */
export const seedFromLexicalJson = (
  docId: string,
  serialized: string,
): Uint8Array => {
  const ydoc = new Y.Doc();
  const editor = createHeadlessEditor({
    namespace: 'lorem-editor',
    nodes: EDITOR_NODES,
    onError: (error) => {
      throw error;
    },
  });
  const provider = createStubProvider();
  const binding = createBinding(
    editor,
    provider,
    docId,
    ydoc,
    new Map([[docId, ydoc]]),
  );
  const unregister = editor.registerUpdateListener(
    ({
      prevEditorState,
      editorState,
      dirtyElements,
      dirtyLeaves,
      normalizedNodes,
      tags,
    }) => {
      syncLexicalUpdateToYjs(
        binding,
        provider,
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      );
    },
  );
  editor.setEditorState(editor.parseEditorState(serialized));
  editor.update(
    () => {
      /* flush the pending state into Yjs synchronously */
    },
    { discrete: true },
  );
  unregister();
  return Y.encodeStateAsUpdate(ydoc);
};
