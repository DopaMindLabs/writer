import { useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { EDITOR_NODES } from './nodes';
import { editorTheme } from './editorTheme';
import { EditorPlugins } from './EditorPlugins';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import { invariant } from '@/lib/invariant';
import { isSerialized } from './serialize';
import type { EditorMode } from './EditorFacade';

interface LexicalEditorProps {
  initialValue: string;
  onChange: (serialized: string) => void;
  mode: EditorMode;
  placeholder?: string;
  autoFocus?: boolean;
  locked?: boolean;
  wordLimit?: number;
  charLimit?: number;
}

export const LexicalEditor = ({
  initialValue,
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
      editorState: makeInitialState(initialValue),
    }),
    [initialValue, baseEditable],
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
        <EditorPlugins
          onChange={onChange}
          editable={editable}
          floatingToolbarEnabled={floatingToolbarEnabled}
          wordLimit={wordLimit}
          charLimit={charLimit}
        />
      </div>
    </LexicalComposer>
  );
};

const makeInitialState = (value: string): string => {
  invariant(isSerialized(value), 'Doc.body must be serialized Lexical JSON');
  return value;
};
