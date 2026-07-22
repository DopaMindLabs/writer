import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/db';
import {
  writeDocBodyBaseline,
  readDocBodyBaseline,
  deleteDocBodyBaseline,
} from '@/lib/docs';
import {
  addDocWithoutCrdt,
  canon,
  crdtSnapshot,
  seedLocalDoc,
  updateRows,
} from '@/test/reconcileFixtures';
import { reconcileDocForMount } from './reconcileDocForMount';

describe('reconcileDocForMount', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('seeds an empty log from the body without a spurious revision, recording the baseline', async () => {
    const body = canon('pulled while the doc was closed');
    await addDocWithoutCrdt('d1', body);

    await reconcileDocForMount('d1', body);

    expect(await crdtSnapshot('d1')).toBe(body);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await readDocBodyBaseline('d1')).toBe(body);
  });

  it('lets a pulled body win when the row differs from the local baseline, keeping the local side', async () => {
    // The CRDT and baseline are our last local write; the body arg is a newer body
    // pulled from another device (it differs from the baseline). The body wins.
    await seedLocalDoc('d1', canon('stale local content'));
    await writeDocBodyBaseline('d1', canon('stale local content'));

    await reconcileDocForMount('d1', canon('newer pulled content'));

    expect(await crdtSnapshot('d1')).toBe(canon('newer pulled content'));
    const revisions = await db.revisions.where('docId').equals('d1').toArray();
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.text).toContain('stale local content');
    expect(await readDocBodyBaseline('d1')).toBe(canon('newer pulled content'));
  });

  it('keeps unsaved keystrokes when the row still equals the local baseline', async () => {
    // Closing the page inside the autosave debounce leaves the CRDT ahead of the
    // row, but the row still equals what we last wrote (the baseline). The CRDT
    // wins; nothing is discarded. This needs no cloud pull to happen — it is why
    // the gate runs on every mount, provider or not.
    await seedLocalDoc('d1', canon('typed but not yet autosaved'));
    await writeDocBodyBaseline('d1', canon('stale body'));

    await reconcileDocForMount('d1', canon('stale body'));

    expect(await crdtSnapshot('d1')).toBe(canon('typed but not yet autosaved'));
    const doc = await db.docs.get('d1');
    expect(doc?.body).toBe(canon('typed but not yet autosaved'));
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await readDocBodyBaseline('d1')).toBe(canon('typed but not yet autosaved'));
  });

  it('leaves a log that already matches the body untouched, recording the baseline', async () => {
    await seedLocalDoc('d1', canon('already in sync'));
    const before = await updateRows('d1');

    await reconcileDocForMount('d1', canon('already in sync'));

    expect(await updateRows('d1')).toHaveLength(before.length);
    expect(await db.revisions.where('docId').equals('d1').count()).toBe(0);
    expect(await readDocBodyBaseline('d1')).toBe(canon('already in sync'));
  });

  describe('when the baseline is missing entirely', () => {
    /** A divergent doc whose provenance marker is gone — the row cannot be proved
     *  to be ours, so the mount must still open without discarding either side. */
    const seedUnprovableDoc = async (): Promise<void> => {
      await seedLocalDoc('d1', canon('local content'));
      await deleteDocBodyBaseline('d1');
    };

    it('opens the doc rather than failing the gate for good', async () => {
      await seedUnprovableDoc();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(
        reconcileDocForMount('d1', canon('different pulled content')),
      ).resolves.toBeUndefined();

      warn.mockRestore();
    });

    it('lets the row win, since a wrong guess must not propagate through sync', async () => {
      await seedUnprovableDoc();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await reconcileDocForMount('d1', canon('different pulled content'));

      // Preferring the CRDT here would push unprovable local text into a synced
      // row and on to every other device; preferring the row keeps the guess local.
      expect(await crdtSnapshot('d1')).toBe(canon('different pulled content'));
      expect(await readDocBodyBaseline('d1')).toBe(canon('different pulled content'));
      warn.mockRestore();
    });

    it('keeps the losing local side recoverable, so the fallback loses nothing', async () => {
      await seedUnprovableDoc();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await reconcileDocForMount('d1', canon('different pulled content'));

      const revisions = await db.revisions.where('docId').equals('d1').toArray();
      expect(revisions).toHaveLength(1);
      expect(revisions[0]?.text).toContain('local content');
      warn.mockRestore();
    });

    it('reports the unprovable state rather than falling back silently', async () => {
      await seedUnprovableDoc();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await reconcileDocForMount('d1', canon('different pulled content'));

      expect(warn).toHaveBeenCalledTimes(1);
      // Diagnostics identify the doc without carrying its text.
      const logged = warn.mock.calls[0]?.join(' ') ?? '';
      expect(logged).toContain('d1');
      expect(logged).not.toContain('local content');
      warn.mockRestore();
    });
  });

  it('decides the same winner regardless of the row updatedAt (no wall-clock comparison)', async () => {
    // Same operation sequence, once with the row's clock far ahead of local time
    // and once far behind. Provenance, not the clock, decides — so the outcome is
    // identical: the unsaved keystrokes win both times.
    const run = async (rowUpdatedAt: number): Promise<string> => {
      await db.delete();
      await db.open();
      await seedLocalDoc('d1', canon('typed but not yet autosaved'));
      await writeDocBodyBaseline('d1', canon('stale body'));
      await db.docs.update('d1', { updatedAt: rowUpdatedAt });
      await reconcileDocForMount('d1', canon('stale body'));
      return crdtSnapshot('d1');
    };

    expect(await run(Date.now() + 10_000_000)).toBe(canon('typed but not yet autosaved'));
    expect(await run(Date.now() - 10_000_000)).toBe(canon('typed but not yet autosaved'));
  });
});
