import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { AUTO_REVISION_MIN_INTERVAL_MS } from './createRevision';
import {
  captureAutoRevision,
  captureBaselineRevision,
  resetAutoThrottle,
} from './captureAutoRevision';
import { serializedBody } from '@/test/fixtures';

const DOC = 'd1';

const countFor = (docId: string): Promise<number> =>
  db.revisions.where('docId').equals(docId).count();

describe('captureBaselineRevision', () => {
  beforeEach(() => { resetAutoThrottle(); });

  it('records a baseline when the document has no revisions yet', async () => {
    await captureBaselineRevision(DOC, serializedBody('opening text'), () => 1000);
    const rows = await db.revisions.where('docId').equals(DOC).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('baseline');
  });

  it('does not add a second baseline when revisions already exist', async () => {
    await captureBaselineRevision(DOC, serializedBody('opening text'), () => 1000);
    await captureBaselineRevision(DOC, serializedBody('opening text'), () => 2000);
    expect(await countFor(DOC)).toBe(1);
  });
});

describe('captureAutoRevision', () => {
  beforeEach(() => { resetAutoThrottle(); });

  it('captures on first change then throttles within the interval', async () => {
    await captureAutoRevision(DOC, serializedBody('v1'), () => 0);
    expect(await countFor(DOC)).toBe(1);

    await captureAutoRevision(DOC, serializedBody('v2'), () => AUTO_REVISION_MIN_INTERVAL_MS - 1);
    expect(await countFor(DOC)).toBe(1);
  });

  it('captures again once the interval has elapsed and text changed', async () => {
    await captureAutoRevision(DOC, serializedBody('v1'), () => 0);
    await captureAutoRevision(DOC, serializedBody('v2'), () => AUTO_REVISION_MIN_INTERVAL_MS + 1);
    expect(await countFor(DOC)).toBe(2);
  });

  it('skips capture when text is unchanged even past the interval', async () => {
    await captureAutoRevision(DOC, serializedBody('same'), () => 0);
    await captureAutoRevision(DOC, serializedBody('same'), () => AUTO_REVISION_MIN_INTERVAL_MS * 10);
    expect(await countFor(DOC)).toBe(1);
  });

  it('resetAutoThrottle clears state so the next change captures', async () => {
    await captureAutoRevision(DOC, serializedBody('v1'), () => 0);
    resetAutoThrottle(DOC);
    await captureAutoRevision(DOC, serializedBody('v2'), () => 1);
    expect(await countFor(DOC)).toBe(2);
  });

  // A second tab has its own empty in-memory throttle, so the Map alone cannot
  // stop it re-capturing content the first tab already stored. The store-backed
  // guard dedupes against the doc's most recent revision regardless of tab.
  it('does not duplicate a revision another tab already captured (same text)', async () => {
    await captureAutoRevision(DOC, serializedBody('shared draft'), () => 0);
    resetAutoThrottle(DOC); // simulate a different tab with fresh throttle state
    await captureAutoRevision(DOC, serializedBody('shared draft'), () => 60_000);
    expect(await countFor(DOC)).toBe(1);
  });

  it('still captures from another tab when the text has diverged', async () => {
    await captureAutoRevision(DOC, serializedBody('shared draft'), () => 0);
    resetAutoThrottle(DOC);
    await captureAutoRevision(DOC, serializedBody('shared draft, revised'), () => 60_000);
    expect(await countFor(DOC)).toBe(2);
  });

  it('dedupes against a baseline captured by another tab', async () => {
    await captureBaselineRevision(DOC, serializedBody('opening'), () => 0);
    resetAutoThrottle(DOC);
    await captureAutoRevision(DOC, serializedBody('opening'), () => 60_000);
    expect(await countFor(DOC)).toBe(1);
  });
});
