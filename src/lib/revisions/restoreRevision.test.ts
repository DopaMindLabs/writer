import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
import { sampleDoc, sampleSpace, sampleSection } from '@/test/fixtures';
import { createRevision } from './createRevision';
import { restoreRevision } from './restoreRevision';
import { InvariantError } from '@/lib/invariant';

describe('restoreRevision', () => {
  beforeEach(async () => {
    useUI.setState({ restoreNonces: {} });
    await db.spaces.put(sampleSpace);
    await db.sections.put(sampleSection);
    await db.docs.put({ ...sampleDoc, body: 'current body', meta: { wordCount: 2 } });
  });

  it('restores the target body and snapshots the current state first', async () => {
    const target = await createRevision(sampleDoc.id, 'old body text', {
      kind: 'manual',
      now: () => 1000,
    });

    await restoreRevision(sampleDoc.id, target.id, { now: () => 5000 });

    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.body).toBe('old body text');
    expect(doc?.updatedAt).toBe(5000);

    const safety = (await db.revisions.where('docId').equals(sampleDoc.id).toArray())
      .find((r) => r.label === 'pre-restore');
    expect(safety).toBeDefined();
    expect(safety?.body).toBe('current body');
    expect(safety?.kind).toBe('manual');
  });

  it('bumps only the restored doc\'s nonce so other open docs do not remount', async () => {
    const target = await createRevision(sampleDoc.id, 'old body text', {
      kind: 'manual',
    });

    expect(useUI.getState().restoreNonces[sampleDoc.id] ?? 0).toBe(0);
    await restoreRevision(sampleDoc.id, target.id);

    expect(useUI.getState().restoreNonces[sampleDoc.id]).toBe(1);
    expect(useUI.getState().restoreNonces['other-doc']).toBeUndefined();
  });

  it('rejects an unknown revision id', async () => {
    await expect(
      restoreRevision(sampleDoc.id, 'nope'),
    ).rejects.toBeInstanceOf(InvariantError);
  });

  it('rejects a revision that belongs to a different document', async () => {
    const other = await createRevision('other-doc', 'x', { kind: 'manual' });
    await expect(
      restoreRevision(sampleDoc.id, other.id),
    ).rejects.toBeInstanceOf(InvariantError);
  });

  it('rejects when the document has been deleted between revision and restore', async () => {
    const target = await createRevision(sampleDoc.id, 'old body', {
      kind: 'manual',
    });
    await db.docs.delete(sampleDoc.id);
    await expect(
      restoreRevision(sampleDoc.id, target.id),
    ).rejects.toBeInstanceOf(InvariantError);
  });

  it('rejects a corrupt Lexical body instead of writing it over the doc', async () => {
    // Looks like serialized Lexical JSON (has a root) but contains a node type
    // the editor cannot parse — e.g. a row written under a different editor
    // version, or corrupted in storage. Inserted directly because
    // createRevision would refuse to snapshot it in the first place.
    const corrupt =
      '{"root":{"children":[{"type":"no-such-node","version":1}],' +
      '"direction":null,"format":"","indent":0,"type":"root","version":1}}';
    await db.revisions.put({
      id: 'rev-corrupt',
      docId: sampleDoc.id,
      body: corrupt,
      text: '',
      wordCount: 0,
      kind: 'manual',
      createdAt: 1000,
    });

    await expect(
      restoreRevision(sampleDoc.id, 'rev-corrupt'),
    ).rejects.toBeInstanceOf(InvariantError);

    // The doc is untouched and no pre-restore snapshot was left behind.
    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.body).toBe('current body');
    const snapshots = (
      await db.revisions.where('docId').equals(sampleDoc.id).toArray()
    ).filter((r) => r.label === 'pre-restore');
    expect(snapshots).toHaveLength(0);
  });

  it('falls back to Date.now when no clock is supplied', async () => {
    const target = await createRevision(sampleDoc.id, 'old body', {
      kind: 'manual',
      now: () => 1000,
    });
    const before = Date.now();
    await restoreRevision(sampleDoc.id, target.id);
    const after = Date.now();
    const doc = await db.docs.get(sampleDoc.id);
    expect(doc?.updatedAt).toBeGreaterThanOrEqual(before);
    expect(doc?.updatedAt).toBeLessThanOrEqual(after);
  });
});
