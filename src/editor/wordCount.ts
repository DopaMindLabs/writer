// Word counting for serialized Lexical document bodies.
//
// Bodies are stored as serialized Lexical JSON. `countWords` extracts plaintext
// with the same headless-editor path the Doc Inspector and revision capture use
// (`lexicalJsonToPlainText`), so the cached `doc.meta.wordCount` and the
// Inspector's live count always agree — a tree-walk that joins text nodes with
// spaces would invent word boundaries at inline-formatting splits. The walk is
// kept only as a fallback so counting never throws into the autosave path when
// a body fails to parse.

import { lexicalJsonToPlainText } from '@/lib/revisions/lexicalJsonToPlainText';

const countTokens = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const extractTextFromLexicalState = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';
  const obj = node as { text?: string; children?: unknown[] };
  if (typeof obj.text === 'string') return obj.text;
  if (Array.isArray(obj.children)) {
    return obj.children.map(extractTextFromLexicalState).join(' ');
  }
  return '';
};

export const countWords = (body: string): number => {
  if (!body) return 0;
  try {
    // lexicalJsonToPlainText returns non-serialized bodies unchanged, so this
    // also covers legacy plain-text bodies.
    return countTokens(lexicalJsonToPlainText(body));
  } catch {
    /* unparseable Lexical JSON — fall back to the lenient tree walk */
  }
  try {
    const parsed = JSON.parse(body) as { root?: unknown };
    if (parsed.root) {
      return countTokens(extractTextFromLexicalState(parsed.root));
    }
  } catch {
    /* not JSON, treat as plain text */
  }
  return countTokens(body);
};
