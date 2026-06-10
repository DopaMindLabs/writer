import { $getRoot } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { readLexicalBody } from '@/lib/revisions';

/** One heading of the document, in document order. */
export interface OutlineEntry {
  /** Heading depth 1–6 (`h1` → 1). */
  readonly level: number;
  readonly text: string;
}

// Extracts the document outline — its headings, in order — from serialized
// Lexical JSON. Headings are block-level nodes in this editor, so scanning the
// root's direct children covers every heading it can produce. Headings with no
// text carry no name worth listing and are skipped, so the outline length
// always matches the rendered rows.
export const lexicalJsonToOutline = (body: string): OutlineEntry[] => {
  if (!body) return [];
  return readLexicalBody(body, () =>
    $getRoot()
      .getChildren()
      .filter($isHeadingNode)
      .map((heading) => ({
        // HeadingTagType is 'h1'…'h6', so the digit after the `h` is the level.
        level: Number(heading.getTag().charAt(1)),
        text: heading.getTextContent().trim(),
      }))
      .filter((entry) => entry.text.length > 0),
  );
};
