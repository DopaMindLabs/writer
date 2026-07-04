import type { RefObject } from 'react';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutosavePlugin } from './plugins/AutosavePlugin';
import { EditablePlugin } from './plugins/EditablePlugin';
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin';
import { LimitHighlightPlugin } from './plugins/LimitHighlightPlugin';

interface EditorPluginsProps {
  onChange: (serialized: string) => void;
  editable: boolean;
  floatingToolbarEnabled: boolean;
  flushRef?: RefObject<() => boolean>;
  wordLimit?: number;
  charLimit?: number;
}

/** The non-rich-text plugin stack mounted inside the Lexical composer. */
export const EditorPlugins = ({
  onChange,
  editable,
  floatingToolbarEnabled,
  flushRef,
  wordLimit,
  charLimit,
}: EditorPluginsProps) => (
  <>
    <ListPlugin />
    <LinkPlugin />
    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    {editable && <AutosavePlugin onChange={onChange} flushRef={flushRef} />}
    {editable && (Boolean(wordLimit) || Boolean(charLimit)) && (
      <LimitHighlightPlugin wordLimit={wordLimit} charLimit={charLimit} />
    )}
    {editable && floatingToolbarEnabled && <FloatingToolbarPlugin />}
    <EditablePlugin editable={editable} />
  </>
);
