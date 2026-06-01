// Pure offset math for the over-limit highlight. Kept free of Lexical/DOM so it
// can be unit-tested in isolation — the editor plugin feeds it the ordered text
// of the document and maps the result back to a DOM range.
//
// Segments are the document's text nodes in order; a segment with nodeKey ===
// null is a structural separator (a block break) that counts toward the text
// but carries no editable position. Counting is done over the concatenation of
// every segment's text; the returned boundary is the first OVER-limit character
// expressed as a UTF-16 offset within a real text node (the unit DOM ranges
// use), so everything from there to the end of the document is over the limit.

export interface TextSegment {
  text: string;
  nodeKey: string | null;
}

export interface LimitBoundary {
  nodeKey: string;
  offset: number;
}

export interface Limits {
  wordLimit?: number;
  charLimit?: number;
}

// UTF-16 index at which the (limit+1)-th code point begins, or null when the
// text has at most `limit` code points. Counting in code points keeps a
// surrogate-pair emoji as one character while the offset stays in UTF-16 units.
const charBoundary = (full: string, limit: number): number | null => {
  let count = 0;
  let utf16 = 0;
  for (const codePoint of full) {
    if (count === limit) return utf16;
    count += 1;
    utf16 += codePoint.length;
  }
  return null;
};

// UTF-16 index just after the end of the `limit`-th word (whitespace-delimited,
// matching countWords), or null when the text has at most `limit` words or no
// text follows the limit.
const wordBoundary = (full: string, limit: number): number | null => {
  const re = /\S+/g;
  let count = 0;
  for (let match = re.exec(full); match !== null; match = re.exec(full)) {
    count += 1;
    if (count === limit) {
      const end = match.index + match[0].length;
      return end < full.length ? end : null;
    }
  }
  return null;
};

// Map a global UTF-16 index in the concatenated text to a position in a real
// text node. When the index lands inside a structural separator, snap to the
// start of the next text node.
const mapToNode = (
  segments: TextSegment[],
  index: number,
): LimitBoundary | null => {
  let start = 0;
  let pendingNextNode = false;
  for (const segment of segments) {
    const end = start + segment.text.length;
    const key = segment.nodeKey;
    if (pendingNextNode) {
      if (key !== null && segment.text.length > 0) {
        return { nodeKey: key, offset: 0 };
      }
    } else if (index < end) {
      if (key !== null) return { nodeKey: key, offset: index - start };
      pendingNextNode = true; // boundary fell in a separator
    }
    start = end;
  }
  return null;
};

export const computeLimitBoundary = (
  segments: TextSegment[],
  limits: Limits,
): LimitBoundary | null => {
  const full = segments.map((segment) => segment.text).join('');
  if (!full) return null;

  const candidates: number[] = [];
  if (limits.charLimit !== undefined && limits.charLimit > 0) {
    const boundary = charBoundary(full, limits.charLimit);
    if (boundary !== null) candidates.push(boundary);
  }
  if (limits.wordLimit !== undefined && limits.wordLimit > 0) {
    const boundary = wordBoundary(full, limits.wordLimit);
    if (boundary !== null) candidates.push(boundary);
  }
  if (candidates.length === 0) return null;

  return mapToNode(segments, Math.min(...candidates));
};
