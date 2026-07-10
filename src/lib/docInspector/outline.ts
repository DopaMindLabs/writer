import { $getRoot } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { readLexicalBody } from '@/lib/revisions';

export interface OutlineEntry {
  readonly level: number;
  readonly text: string;
}

export const lexicalJsonToOutline = (body: string): OutlineEntry[] => {
  if (!body) return [];
  return readLexicalBody(body, () =>
    $getRoot()
      .getChildren()
      .filter($isHeadingNode)
      .map((heading) => ({
        level: Number(heading.getTag().charAt(1)),
        text: heading.getTextContent().trim(),
      }))
      .filter((entry) => entry.text.length > 0),
  );
};
