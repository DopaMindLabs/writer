// Word counting for serialized Lexical document bodies.
//
// Bodies are stored as serialized Lexical JSON. `countWords` walks the node tree
// to extract text and counts whitespace-delimited tokens, falling back to plain
// text when the body is not Lexical JSON. Counting is cheap to run when content
// changes and the result is cached in `doc.meta.wordCount`, so navigation
// surfaces can read the number without re-parsing the body on every render.

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
    const parsed = JSON.parse(body) as { root?: unknown };
    if (parsed.root) {
      return countTokens(extractTextFromLexicalState(parsed.root));
    }
  } catch {
    /* not JSON, treat as plain text */
  }
  return countTokens(body);
};
