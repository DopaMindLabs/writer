
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
      pendingNextNode = true;
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
