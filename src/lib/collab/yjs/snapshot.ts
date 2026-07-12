import * as Y from 'yjs';
import type { Text as YText, YEvent } from 'yjs';
import { createHeadlessEditor } from '@lexical/headless';
import { createBinding, syncYjsChangesToLexical } from '@lexical/yjs';
import { EDITOR_NODES } from '@/editor/nodes';
import { createStubProvider } from './stubProvider';

/**
 * Rebuild a document's local CRDT state from its `docUpdates` log and serialise
 * it back to a Lexical JSON body — the inverse of {@link seedFromLexicalJson}.
 *
 * Reconciliation compares this against `docs.body` to distinguish a body the
 * local editor produced (the CRDT dual-write) from one pulled in from another
 * device. A stable round-trip (`snapshot(seed(body)) === body`) is what makes
 * reconciliation idempotent, so no `Y.applyUpdate`/`Y.mergeUpdates` may leave
 * this `yjs/` boundary.
 */
export const serializeDocSnapshot = (
  docId: string,
  updates: readonly Uint8Array[],
): string => {
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
  const sharedRoot = binding.root.getSharedType();
  const applyToLexical = (events: YEvent<YText>[]): void => {
    syncYjsChangesToLexical(binding, provider, events, false);
  };
  sharedRoot.observeDeep(applyToLexical);
  if (updates.length > 0) {
    Y.applyUpdate(ydoc, Y.mergeUpdates([...updates]), 'snapshot');
  }
  sharedRoot.unobserveDeep(applyToLexical);
  // Force any queued reconciliation to flush before we read the state.
  editor.update(() => undefined, { discrete: true });
  return JSON.stringify(editor.getEditorState().toJSON());
};
