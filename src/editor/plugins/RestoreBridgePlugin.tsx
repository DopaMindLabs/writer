import { useEffect, type RefObject } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { registerEditorHandle } from '@/lib/collab/editorRegistry';
import type { FlushResult } from '@/lib/collab/flush.types';

interface RestoreBridgePluginProps {
  docId: string;
  /** The live autosave's flush, so the handle can settle pending edits on demand. */
  flushRef: RefObject<() => Promise<FlushResult>>;
}

/**
 * Registers this mounted editor with the {@link registerEditorHandle} registry so
 * revision and backup restores can replace its content through the live editor.
 * The `setEditorState` update is untagged, so it flows through the Yjs binding's
 * root full-diff branch and is persisted and broadcast like any local edit. The
 * handle also carries the live autosave's `flush`, so cloud reconciliation can
 * settle pending edits before deciding whether the row body is a remote pull.
 */
export const RestoreBridgePlugin = ({
  docId,
  flushRef,
}: RestoreBridgePluginProps) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerEditorHandle(docId, {
      restoreBody: (serialized) => {
        editor.setEditorState(editor.parseEditorState(serialized));
      },
      flush: () => flushRef.current(),
    });
  }, [editor, docId, flushRef]);
  return null;
};
