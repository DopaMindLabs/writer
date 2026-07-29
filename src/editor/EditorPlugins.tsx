import type { RefObject } from 'react';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutosavePlugin } from './plugins/AutosavePlugin';
import { EditablePlugin } from './plugins/EditablePlugin';
import { FloatingToolbarPlugin } from './plugins/FloatingToolbarPlugin';
import { LimitHighlightPlugin } from './plugins/LimitHighlightPlugin';
import type { FlushResult } from '@/lib/collab/flush.types';

interface EditorPluginsProps {
  onChange: (serialized: string) => Promise<void>;
  editable: boolean;
  floatingToolbarEnabled: boolean;
  flushRef?: RefObject<() => Promise<FlushResult>>;
  /** The body persisted at mount; seeds the autosave baseline (see AutosavePlugin). */
  persistedBody?: string;
  wordLimit?: number;
  charLimit?: number;
}

/** The non-rich-text plugin stack mounted inside the Lexical composer. */
export const EditorPlugins = ({
  onChange,
  editable,
  floatingToolbarEnabled,
  flushRef,
  persistedBody,
  wordLimit,
  charLimit,
}: EditorPluginsProps) => (
  <>
    <ListPlugin />
    <LinkPlugin />
    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    {editable && (
      <AutosavePlugin
        onChange={onChange}
        flushRef={flushRef}
        persistedBody={persistedBody}
      />
    )}
    {editable && (Boolean(wordLimit) || Boolean(charLimit)) && (
      <LimitHighlightPlugin wordLimit={wordLimit} charLimit={charLimit} />
    )}
    {editable && floatingToolbarEnabled && <FloatingToolbarPlugin />}
    <EditablePlugin editable={editable} />
  </>
);
