import { createHeadlessEditor } from '@lexical/headless';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { $getRoot } from 'lexical';
import { isSerialized } from '@/editor/serialize';

const HEADLESS_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
  CodeHighlightNode,
];

let sharedEditor: ReturnType<typeof createHeadlessEditor> | null = null;
const getSharedEditor = (): ReturnType<typeof createHeadlessEditor> => {
  sharedEditor ??= createHeadlessEditor({
    namespace: 'lorem-revision',
    nodes: HEADLESS_NODES,
    onError(err: Error) {
      throw err;
    },
  });
  return sharedEditor;
};

/**
 * Read a serialized Lexical body without mounting it. `parseEditorState(...).read`
 * evaluates the callback against the parsed state directly — it never calls
 * `setEditorState`, which throws (Lexical error #38) on an empty-root body and
 * would also mutate the shared headless editor. A childless root therefore reads
 * as empty text rather than crashing.
 */
export const readLexicalBody = <T>(body: string, read: () => T): T =>
  getSharedEditor().parseEditorState(body).read(read);

export const lexicalJsonToPlainText = (body: string): string => {
  if (!body) return '';
  return readLexicalBody(body, () => $getRoot().getTextContent());
};

export const isParseableBody = (body: string): boolean => {
  if (!body) return true;
  if (!isSerialized(body)) return false;
  try {
    getSharedEditor().parseEditorState(body);
    return true;
  } catch {
    return false;
  }
};

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

export const countCharacters = (text: string): number => Array.from(text).length;
