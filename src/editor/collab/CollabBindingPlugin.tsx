import type { DocSyncSession } from '@/lib/docsync/ports';
import { YjsLexicalBinding } from './yjs/YjsLexicalBinding';

interface CollabBindingPluginProps {
  readonly session: DocSyncSession;
  /** Serialised Lexical JSON used to seed a fresh session from the body. */
  readonly initialSerialized: string;
}

/**
 * Vendor-neutral entry point for the editor↔engine binding. The editor only
 * imports this; switching to a different CRDT means swapping the adapter
 * below, not edits to the editor surface.
 */
export const CollabBindingPlugin = ({
  session,
  initialSerialized,
}: CollabBindingPluginProps) => {
  const seed = session.hasStoredState ? null : initialSerialized || null;
  return (
    <YjsLexicalBinding
      docId={session.docId}
      handle={session.handle}
      initialEditorState={seed}
    />
  );
};
