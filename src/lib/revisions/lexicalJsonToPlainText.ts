import { createHeadlessEditor } from '@lexical/headless';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { $getRoot } from 'lexical';
import { isSerialized } from '@/editor/serialize';

// Kept in sync with the node list registered for the live editor; mirrors
// lexicalToMarkdown.ts so an off-React parse loads the same node types.
const HEADLESS_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
  CodeHighlightNode,
];

// One headless editor for the whole module. Allocating a fresh editor on
// every call (which fires per autosave tick and per InfoPane memo refresh)
// is pure overhead — the editor is stateless across reads once we replace
// its state for each body.
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

// Extracts plaintext from serialized Lexical JSON, off-React. A non-serialized
// string (legacy plain body) is returned as-is. This is the single place
// Revision capture parses Lexical outside the editor.
export const lexicalJsonToPlainText = (body: string): string => {
  if (!body) return '';
  if (!isSerialized(body)) return body;

  const editor = getSharedEditor();
  const state = editor.parseEditorState(body);
  editor.setEditorState(state);

  let out = '';
  editor.getEditorState().read(() => {
    out = $getRoot().getTextContent();
  });
  return out;
};

// Cheap, dependency-free word count over extracted plaintext.
export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

// Character count over extracted plaintext. Array.from counts Unicode code
// points (so a surrogate-pair emoji counts as one), matching the over-limit
// boundary math in src/lib/docInspector/boundary.ts.
export const countCharacters = (text: string): number => Array.from(text).length;
