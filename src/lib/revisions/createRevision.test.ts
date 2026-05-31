import { describe, it, expect } from 'vitest';
import { db } from '@/db/db';
import {
  createRevision,
  MAX_AUTO_REVISIONS_PER_DOC,
} from './createRevision';

const DOC = 'd1';

describe('createRevision', () => {
  it('writes a revision row with extracted text and word count', async () => {
    const fixed = Date.UTC(2026, 4, 16, 12, 0);
    const rev = await createRevision(DOC, 'Hello brave world', {
      kind: 'manual',
      label: 'first draft',
      now: () => fixed,
    });

    expect(rev.kind).toBe('manual');
    expect(rev.label).toBe('first draft');
    expect(rev.docId).toBe(DOC);
    expect(rev.createdAt).toBe(fixed);
    expect(rev.text).toBe('Hello brave world');
    expect(rev.wordCount).toBe(3);

    const stored = await db.revisions.get(rev.id);
    expect(stored).toBeDefined();
  });

  it('prunes the oldest automatic revisions beyond the cap', async () => {
    const base = Date.UTC(2026, 4, 16, 12, 0);
    const ids: string[] = [];
    for (let i = 0; i < MAX_AUTO_REVISIONS_PER_DOC + 3; i += 1) {
      const rev = await createRevision(DOC, `body ${i}`, {
        kind: 'auto',
        now: () => base + i,
      });
      ids.push(rev.id);
    }

    const remaining = await db.revisions.where('docId').equals(DOC).count();
    expect(remaining).toBe(MAX_AUTO_REVISIONS_PER_DOC);
    // Oldest three pruned, newest kept.
    expect(await db.revisions.get(ids[0])).toBeUndefined();
    expect(await db.revisions.get(ids[2])).toBeUndefined();
    expect(await db.revisions.get(ids[ids.length - 1])).toBeDefined();
  });

  it('never prunes manual, baseline, or pinned revisions', async () => {
    const base = Date.UTC(2026, 4, 16, 12, 0);
    const baseline = await createRevision(DOC, 'baseline', {
      kind: 'baseline',
      now: () => base,
    });
    const manual = await createRevision(DOC, 'manual', {
      kind: 'manual',
      now: () => base + 1,
    });
    const pinnedAuto = await createRevision(DOC, 'pinned', {
      kind: 'auto',
      pinned: true,
      now: () => base + 2,
    });

    for (let i = 0; i < MAX_AUTO_REVISIONS_PER_DOC + 5; i += 1) {
      await createRevision(DOC, `auto ${i}`, {
        kind: 'auto',
        now: () => base + 10 + i,
      });
    }

    expect(await db.revisions.get(baseline.id)).toBeDefined();
    expect(await db.revisions.get(manual.id)).toBeDefined();
    expect(await db.revisions.get(pinnedAuto.id)).toBeDefined();
  });
});
