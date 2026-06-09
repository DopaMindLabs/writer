// Word counting for serialized Lexical document bodies.
//
// Bodies are stored as serialized Lexical JSON (or '' for a fresh doc).
// `countWords` extracts plaintext with the same headless-editor path the Doc
// Inspector and revision capture use (`lexicalJsonToPlainText`), so the cached
// `doc.meta.wordCount` and the Inspector's live count always agree. Counting
// runs on autosave, whose input is always serializeState output, so a
// non-empty body that fails to parse throws rather than being silently
// miscounted.

import { lexicalJsonToPlainText } from '@/lib/revisions/lexicalJsonToPlainText';

const countTokens = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

export const countWords = (body: string): number => {
  if (!body) return 0;
  return countTokens(lexicalJsonToPlainText(body));
};
