/**
 * The canonical body of an empty document: a serialized Lexical state holding a
 * single empty paragraph. Every document body is serialized Lexical JSON, so a
 * new or cleared doc uses this rather than an empty string.
 */
export const EMPTY_LEXICAL_JSON =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
