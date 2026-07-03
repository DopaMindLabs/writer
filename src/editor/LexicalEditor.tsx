import { useMemo, type RefObject } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { EDITOR_NODES } from './nodes';
import { editorTheme } from './editorTheme';
import { EditorPlugins } from './EditorPlugins';
import { RestoreBridgePlugin } from './plugins/RestoreBridgePlugin';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { ProviderFactory } from '@/lib/collab/yjs/providerFactory';
import type { EditorMode } from './EditorFacade';

interface LexicalEditorProps {
  docId: string;
  providerFactory: ProviderFactory;
  username: string;
  cursorColor: string;
  cursorsContainerRef: RefObject<HTMLElement | null>;
  onChange: (serialized: string) => void;
  mode: EditorMode;
  placeholder?: string;
  autoFocus?: boolean;
  locked?: boolean;
  wordLimit?: number;
  charLimit?: number;
}

export const LexicalEditor = ({
  docId,
  providerFactory,
  username,
  cursorColor,
  cursorsContainerRef,
  onChange,
  mode,
  placeholder = 'Start writing…',
  autoFocus = true,
  locked = false,
  wordLimit,
  charLimit,
}: LexicalEditorProps) => {
  const baseEditable = mode !== 'read';
  const editable = baseEditable && !locked;
  const floatingToolbarEnabled = useUI((s) => s.floatingToolbarEnabled);

  const initialConfig = useMemo(
    () => ({
      namespace: 'lorem-editor',
      theme: editorTheme,
      editable: baseEditable,
      onError(error: Error) {
        console.error('Lexical error:', error);
      },
      nodes: EDITOR_NODES,
      // Collaboration mode owns the initial state; the CRDT seed provides content.
      editorState: null,
    }),
    [baseEditable],
  );

  const surfaceClasses = cn(
    'relative mx-auto w-full font-serif text-ink',
    mode === 'focus' &&
      'max-w-[68ch] text-[length:calc(1.125rem*var(--reading-scale))] leading-[calc(1.7*var(--reading-leading-scale))]',
    mode === 'read' &&
      'max-w-[68ch] text-[length:calc(18px*var(--reading-scale))] leading-[calc(1.75*var(--reading-leading-scale))]',
    mode === 'write' &&
      'max-w-[68ch] text-[length:calc(17px*var(--reading-scale))] leading-[calc(1.6*var(--reading-leading-scale))]',
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalCollaboration>
        <div className={surfaceClasses}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'min-h-[60vh] outline-none',
                  mode === 'read' && 'caret-transparent',
                )}
                data-testid="document-body"
                aria-label="Document body"
                autoFocus={autoFocus && editable}
                readOnly={!editable}
              />
            }
            placeholder={
              editable ? (
                <div className="pointer-events-none absolute left-0 top-0 select-none text-ink-4">
                  {placeholder}
                </div>
              ) : null
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <CollaborationPlugin
            id={docId}
            providerFactory={providerFactory}
            shouldBootstrap={false}
            username={username}
            cursorColor={cursorColor}
            cursorsContainerRef={cursorsContainerRef}
          />
          <RestoreBridgePlugin docId={docId} />
          <EditorPlugins
            onChange={onChange}
            editable={editable}
            floatingToolbarEnabled={floatingToolbarEnabled}
            wordLimit={wordLimit}
            charLimit={charLimit}
          />
        </div>
      </LexicalCollaboration>
    </LexicalComposer>
  );
};
