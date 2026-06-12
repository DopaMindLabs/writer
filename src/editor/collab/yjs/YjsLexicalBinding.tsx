import { useCallback } from 'react';
import type { Doc } from 'yjs';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { docFromHandle } from '@/lib/docsync/adapters/yjs/yjsEngine';
import type { EditorBindingHandle } from '@/lib/docsync/ports';
import { createLocalProvider } from './LocalProvider';

interface YjsLexicalBindingProps {
  /** Stable id keying the Y.Doc inside CollaborationPlugin's internal map. */
  readonly docId: string;
  readonly handle: EditorBindingHandle;
  /** Serialised Lexical JSON used to bootstrap an empty/fresh Y.Doc. */
  readonly initialEditorState: string | null;
}

/**
 * Concrete editor binding for Yjs. The single validated boundary where the
 * opaque handle is narrowed back to the vendor type — every other place in
 * the editor talks to the binding through {@link CollabBindingPlugin}.
 */
export const YjsLexicalBinding = ({
  docId,
  handle,
  initialEditorState,
}: YjsLexicalBindingProps) => {
  const doc = docFromHandle(handle);

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>) => {
      yjsDocMap.set(id, doc);
      return createLocalProvider(doc);
    },
    [doc],
  );

  return (
    <CollaborationPlugin
      id={docId}
      providerFactory={providerFactory}
      shouldBootstrap
      initialEditorState={initialEditorState ?? undefined}
    />
  );
};
