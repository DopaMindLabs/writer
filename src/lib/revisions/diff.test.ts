import { describe, it, expect } from 'vitest';
import { computeInlineDiff, computeSideBySideDiff } from './diff';

describe('computeInlineDiff', () => {
  it('marks every segment equal for identical text', () => {
    const segs = computeInlineDiff('the quick fox', 'the quick fox');
    expect(segs.every((s) => s.op === 'equal')).toBe(true);
    expect(segs.map((s) => s.value).join('')).toBe('the quick fox');
  });

  it('reports added and removed words', () => {
    const segs = computeInlineDiff('the quick fox', 'the slow fox');
    const ops = segs.map((s) => s.op);
    expect(ops).toContain('removed');
    expect(ops).toContain('added');
    const removed = segs.find((s) => s.op === 'removed');
    const added = segs.find((s) => s.op === 'added');
    expect(removed?.value).toContain('quick');
    expect(added?.value).toContain('slow');
  });
});

describe('computeSideBySideDiff', () => {
  it('mirrors equal lines on both sides', () => {
    const rows = computeSideBySideDiff('a\nb', 'a\nb');
    expect(rows.every((r) => r.kind === 'equal' && r.left === r.right)).toBe(
      true,
    );
    expect(rows.map((r) => r.left)).toEqual(['a', 'b']);
  });

  it('pairs a replaced line as a changed row', () => {
    const rows = computeSideBySideDiff('one\ntwo\nthree', 'one\nTWO\nthree');
    const changed = rows.find((r) => r.kind === 'changed');
    expect(changed).toBeDefined();
    expect(changed?.left).toBe('two');
    expect(changed?.right).toBe('TWO');
  });

  it('represents a pure addition with an empty left side', () => {
    const rows = computeSideBySideDiff('one', 'one\ntwo');
    const added = rows.find((r) => r.kind === 'added');
    expect(added).toBeDefined();
    expect(added?.left).toBe('');
    expect(added?.right).toBe('two');
  });

  it('represents a pure removal with an empty right side', () => {
    const rows = computeSideBySideDiff('one\ntwo', 'one');
    const removed = rows.find((r) => r.kind === 'removed');
    expect(removed).toBeDefined();
    expect(removed?.left).toBe('two');
    expect(removed?.right).toBe('');
  });
});
