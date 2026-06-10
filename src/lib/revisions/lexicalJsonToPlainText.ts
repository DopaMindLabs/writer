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

// Parses a serialized body with the shared headless editor and evaluates
// `read` inside its EditorState — the single place doc bodies are parsed
// outside the editor (Revision capture, the Doc Inspector outline). Callers
// compose `$`-functions (e.g. `$getRoot`) inside `read`. Doc bodies are
// always either empty or serializeState output (the editor refuses to load
// anything else), so a non-empty body that fails to parse throws.
export const readLexicalBody = <T>(body: string, read: () => T): T => {
  const editor = getSharedEditor();
  const state = editor.parseEditorState(body);
  editor.setEditorState(state);
  return editor.getEditorState().read(read);
};

// Extracts plaintext from serialized Lexical JSON, off-React.
export const lexicalJsonToPlainText = (body: string): string => {
  if (!body) return '';
  return readLexicalBody(body, () => $getRoot().getTextContent());
};

// Whether a stored body can be loaded by the editor: empty (a fresh doc) or
// serialized Lexical JSON that actually parses. Restore paths check this
// before overwriting a live document, so a corrupt revision fails the restore
// instead of bricking the doc.
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
