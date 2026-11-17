import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import {
  createRevision,
  MAX_AUTO_REVISIONS_PER_DOC,
} from './createRevision';
import { sampleDoc, serializedBody } from '@/test/fixtures';

const DOC = 'd1';

// A revision derives its access scope from its document, so the doc row must
// exist before a revision can be created for it.
beforeEach(async () => {
  await db.docs.put(sampleDoc);
});

describe('createRevision', () => {
  it('writes a revision row with extracted text and word count', async () => {
    const fixed = Date.UTC(2026, 4, 16, 12, 0);
    const rev = await createRevision(DOC, serializedBody('Hello brave world'), {
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

  it('creates a revision from a childless-root body without crashing (empty CRDT log)', async () => {
    // A snapshot of a wiped CRDT log serialises to a root with no children.
    // Creating a revision from it must read as empty text, not throw Lexical #38.
    const childlessRoot =
      '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
    const rev = await createRevision(DOC, childlessRoot, { kind: 'manual' });
    expect(rev.text).toBe('');
    expect(rev.wordCount).toBe(0);
    expect(await db.revisions.get(rev.id)).toBeDefined();
  });

  it('prunes the oldest automatic revisions beyond the cap', async () => {
    const base = Date.UTC(2026, 4, 16, 12, 0);
    const ids: string[] = [];
    for (let i = 0; i < MAX_AUTO_REVISIONS_PER_DOC + 3; i += 1) {
      const rev = await createRevision(DOC, serializedBody(`body ${i}`), {
        kind: 'auto',
        now: () => base + i,
      });
      ids.push(rev.id);
    }

    const remaining = await db.revisions.where('docId').equals(DOC).count();
    expect(remaining).toBe(MAX_AUTO_REVISIONS_PER_DOC);
    expect(await db.revisions.get(ids[0])).toBeUndefined();
    expect(await db.revisions.get(ids[2])).toBeUndefined();
    expect(await db.revisions.get(ids[ids.length - 1])).toBeDefined();
  });

  it('never prunes manual, baseline, or pinned revisions', async () => {
    const base = Date.UTC(2026, 4, 16, 12, 0);
    const baseline = await createRevision(DOC, serializedBody('baseline'), {
      kind: 'baseline',
      now: () => base,
    });
    const manual = await createRevision(DOC, serializedBody('manual'), {
      kind: 'manual',
      now: () => base + 1,
    });
    const pinnedAuto = await createRevision(DOC, serializedBody('pinned'), {
      kind: 'auto',
      pinned: true,
      now: () => base + 2,
    });

    for (let i = 0; i < MAX_AUTO_REVISIONS_PER_DOC + 5; i += 1) {
      await createRevision(DOC, serializedBody(`auto ${i}`), {
        kind: 'auto',
        now: () => base + 10 + i,
      });
    }

    expect(await db.revisions.get(baseline.id)).toBeDefined();
    expect(await db.revisions.get(manual.id)).toBeDefined();
    expect(await db.revisions.get(pinnedAuto.id)).toBeDefined();
  });
});
