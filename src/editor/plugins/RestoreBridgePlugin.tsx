import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { registerEditorHandle } from '@/lib/collab/editorRegistry';

interface RestoreBridgePluginProps {
  docId: string;
}

/**
 * Registers this mounted editor with the {@link registerEditorHandle} registry so
 * revision and backup restores can replace its content through the live editor.
 * The `setEditorState` update is untagged, so it flows through the Yjs binding's
 * root full-diff branch and is persisted and broadcast like any local edit.
 */
export const RestoreBridgePlugin = ({ docId }: RestoreBridgePluginProps) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerEditorHandle(docId, {
      restoreBody: (serialized) => {
        editor.setEditorState(editor.parseEditorState(serialized));
      },
    });
  }, [editor, docId]);
  return null;
};
