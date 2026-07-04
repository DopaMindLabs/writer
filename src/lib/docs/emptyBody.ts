/**
 * The canonical body of an empty document: a serialized Lexical state holding a
 * single empty paragraph. Every document body is serialized Lexical JSON, so a
 * new or cleared doc uses this rather than an empty string.
 *
 * It is the *exact* serialization the editor emits for an empty paragraph — the
 * same fields (`textFormat`/`textStyle`) in the same order — so a body written
 * here compares byte-for-byte with one round-tripped through the editor. Cloud
 * reconciliation relies on that (`emptyBody.test.ts` guards it), which is why the
 * default is kept in step with the editor rather than a hand-trimmed subset.
 */
export const EMPTY_LEXICAL_JSON =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
