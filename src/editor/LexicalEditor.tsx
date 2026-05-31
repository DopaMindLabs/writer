import { useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutosavePlugin } from './plugins/AutosavePlugin';
import { EditablePlugin } from './plugins/EditablePlugin';
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { EditorMode } from './EditorFacade';

interface LexicalEditorProps {
  initialValue: string;
  onChange: (serialized: string) => void;
  mode: EditorMode;
  placeholder?: string;
  autoFocus?: boolean;
}

const editorTheme = {
  paragraph: 'mb-4 leading-relaxed',
  heading: {
    h1: 'mb-4 mt-6 font-serif text-3xl font-semibold tracking-tight',
    h2: 'mb-3 mt-6 font-serif text-2xl font-semibold tracking-tight',
    h3: 'mb-2 mt-4 font-serif text-xl font-semibold tracking-tight',
    h4: 'mb-2 mt-3 font-serif text-lg font-semibold tracking-tight',
  },
  list: {
    ul: 'mb-4 list-disc pl-6',
    ol: 'mb-4 list-decimal pl-6',
    listitem: 'mb-1',
  },
  quote: 'mb-4 border-l-2 border-rule pl-4 italic text-ink-2',
  text: {
    bold: 'font-semibold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'rounded bg-paper-2 px-1 py-0.5 font-mono text-sm',
  },
  link: 'text-ink underline underline-offset-2',
};

export const LexicalEditor = ({
  initialValue,
  onChange,
  mode,
  placeholder = 'Start writing…',
  autoFocus = true,
}: LexicalEditorProps) => {
  const editable = mode !== 'read';
  const floatingToolbarEnabled = useUI((s) => s.floatingToolbarEnabled);

  const initialConfig = useMemo(
    () => ({
      namespace: 'lorem-editor',
      theme: editorTheme,
      editable,
      onError(error: Error) {
        console.error('Lexical error:', error);
      },
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        CodeNode,
        CodeHighlightNode,
      ],
      editorState: makeInitialState(initialValue),
    }),
    [initialValue, editable],
  );

  const surfaceClasses = cn(
    'relative mx-auto w-full font-serif text-ink',
    mode === 'focus' && 'max-w-[68ch] text-lg leading-[1.7]',
    mode === 'read' && 'max-w-[68ch] text-[18px] leading-[1.75]',
    mode === 'write' && 'max-w-[68ch] text-[17px] leading-[1.6]',
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
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        {editable && <AutosavePlugin onChange={onChange} />}
        {editable && floatingToolbarEnabled && <FloatingToolbarPlugin />}
        <EditablePlugin editable={editable} />
      </div>
    </LexicalComposer>
  );
};

const makeInitialState = (value: string): string | undefined => {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'root' in parsed &&
      (parsed as { root?: unknown }).root
    ) {
      return value;
    }
  } catch {
    /* fall through */
  }
  return undefined;
};
