import { diffLines, diffWords, type Change } from 'diff';

export type SegmentOp = 'equal' | 'added' | 'removed';

export interface DiffSegment {
  op: SegmentOp;
  value: string;
}

export type RowKind = 'equal' | 'added' | 'removed' | 'changed';

export interface SideBySideRow {
  kind: RowKind;
  left: string;
  right: string;
}

const toSegment = (change: Change): DiffSegment => {
  if (change.added) return { op: 'added', value: change.value };
  if (change.removed) return { op: 'removed', value: change.value };
  return { op: 'equal', value: change.value };
};

// Word-level inline (unified) diff of two plaintext blocks.
export const computeInlineDiff = (
  oldText: string,
  newText: string,
): DiffSegment[] => diffWords(oldText, newText).map(toSegment);

// Splits a line-diff change into individual lines, dropping a single trailing
// empty line that jsdiff appends when the block ends in a newline.
const splitLines = (value: string): string[] => {
  const lines = value.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
};

const pairRemovedAdded = (
  removed: string[],
  added: string[],
): SideBySideRow[] => {
  const rows: SideBySideRow[] = [];
  const paired = Math.min(removed.length, added.length);
  for (let i = 0; i < paired; i += 1) {
    rows.push({ kind: 'changed', left: removed[i], right: added[i] });
  }
  for (let i = paired; i < removed.length; i += 1) {
    rows.push({ kind: 'removed', left: removed[i], right: '' });
  }
  for (let i = paired; i < added.length; i += 1) {
    rows.push({ kind: 'added', left: '', right: added[i] });
  }
  return rows;
};

const flushPending = (
  rows: SideBySideRow[],
  removed: string[],
  added: string[],
): void => {
  if (removed.length === 0 && added.length === 0) return;
  rows.push(...pairRemovedAdded(removed, added));
  removed.length = 0;
  added.length = 0;
};

// Line-level side-by-side diff: removed lines on the left, added lines on the
// right, equal lines mirrored on both sides. Adjacent removed/added runs are
// paired up as "changed" rows for aligned reading.
export const computeSideBySideDiff = (
  oldText: string,
  newText: string,
): SideBySideRow[] => {
  const rows: SideBySideRow[] = [];
  const pendingRemoved: string[] = [];
  const pendingAdded: string[] = [];

  for (const change of diffLines(oldText, newText)) {
    if (change.removed) {
      pendingRemoved.push(...splitLines(change.value));
      continue;
    }
    if (change.added) {
      pendingAdded.push(...splitLines(change.value));
      continue;
    }
    flushPending(rows, pendingRemoved, pendingAdded);
    for (const line of splitLines(change.value)) {
      rows.push({ kind: 'equal', left: line, right: line });
    }
  }
  flushPending(rows, pendingRemoved, pendingAdded);
  return rows;
};
