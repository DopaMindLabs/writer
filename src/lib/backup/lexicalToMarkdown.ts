import { createHeadlessEditor } from '@lexical/headless';
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeHighlightNode, CodeNode } from '@lexical/code';

const HEADLESS_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
  CodeHighlightNode,
];

// Doc bodies are always empty or serializeState output, so a non-empty body
// that fails to parse throws rather than leaking raw text into a backup.
export const lexicalJsonToMarkdown = (body: string): string => {
  if (!body) return '';

  const editor = createHeadlessEditor({
    namespace: 'lorem-backup',
    nodes: HEADLESS_NODES,
    onError(err: Error) {
      throw err;
    },
  });

  const state = editor.parseEditorState(body);
  editor.setEditorState(state);

  let out = '';
  editor.getEditorState().read(() => {
    out = $convertToMarkdownString(TRANSFORMERS);
  });
  return out;
};
