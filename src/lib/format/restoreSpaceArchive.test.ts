import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { db } from '@/db/db';
import { onDocReload } from '@/lib/collab/docReloadChannel';
import { collabSeedKey } from '@/lib/collab/seedKey';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import {
  readSpaceSnapshot,
  type SpaceSnapshot,
} from '@/lib/backup/buildSpaceMarkdownZip';
import {
  ATTACHMENT_BYTES,
  sampleSpace,
  seedRichSpace,
  serializedBody,
} from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';
import { restoreSpaceArchive } from './restoreSpaceArchive';

const WHEN = 1704067200000;

const comparable = (snapshot: SpaceSnapshot): unknown => ({
  ...snapshot,
  attachments: snapshot.attachments.map((a) => ({ ...a, blob: undefined })),
});

const rootXml = (doc: Y.Doc): string =>
  (doc.get('root', Y.XmlText) as Y.XmlText).toString();

/** Plain text of a CRDT seed payload's root shared type. */
const seedText = (payload: Uint8Array): string => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, payload, 'test');
  const xml = rootXml(doc);
  doc.destroy();
  return xml.replace(/<[^>]*>/g, '');
};

const mutateSpace = async (): Promise<void> => {
  await db.docs.update('d1', { body: serializedBody('Vandalised.'), updatedAt: 1 });
  await db.notes.delete('n2');
  await db.connections.delete('c1');
  await db.citations.add({
    id: 'cit-extra',
    spaceId: 's1',
    key: 'extra',
    authors: 'X',
    title: 'Extra',
    year: 2024,
    type: 'misc',
    useCount: 0,
  });
  await db.spaces.update('s1', { name: 'Renamed', updatedAt: 1 });
};

describe('restoreSpaceArchive', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('restores every table to the archived state, byte-for-byte', async () => {
    const before = await readSpaceSnapshot('s1');
    const blob = await buildSpaceArchive(before, WHEN);

    await mutateSpace();
    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    const after = await readSpaceSnapshot('s1');
    expect(comparable(after)).toEqual(comparable(before));
    expect(await after.attachments[0].blob.text()).toBe(ATTACHMENT_BYTES);
    expect(await db.citations.get('cit-extra')).toBeUndefined();
  });

  it('stores a pre-restore snapshot backup before replacing content', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    await mutateSpace();
    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    const backups = await db.backups.where('scope').equals('s1').toArray();
    expect(backups).toHaveLength(1);
    expect(backups[0].kind).toBe('snapshot');
    expect(backups[0].format).toBe('archive-v2');
    expect(backups[0].label).toBe('pre-restore');

    const preRestore = await parseSpaceArchive(backups[0].payload);
    expect(preRestore.space.name).toBe('Renamed');
  });

  it('broadcasts a reload for each restored doc so other tabs drop stale state', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    const onReload = vi.fn();
    const off = onDocReload('d1', onReload);
    await mutateSpace();

    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));
    await new Promise((resolve) => setTimeout(resolve, 30));
    off();

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('clears stale CRDT state and re-seeds restored docs from their bodies', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    // Pretend collaboration wrote stale CRDT state for d1 before the restore.
    await db.docUpdates.add({
      docId: 'd1',
      engine: 'yjs',
      formatVersion: 1,
      payload: new Uint8Array([9, 9, 9]),
      createdAt: 1,
    });
    await db.meta.put({ key: collabSeedKey('d1'), value: { seededAt: 1 } });
    await db.shares.put({
      docId: 'd1',
      roomId: 'room-d1',
      relayUrl: 'wss://relay.example',
      role: 'owner',
      contentEpoch: 1,
      seededBy: 'author-1',
      seededAt: 1,
      rosterVersion: 1,
      createdAt: 1,
    });
    await mutateSpace();

    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    const rows = await db.docUpdates.where('docId').equals('d1').toArray();
    expect(rows).toHaveLength(1); // stale log cleared, exactly one fresh seed
    expect(await db.meta.get(collabSeedKey('d1'))).toBeDefined();
    // A restored doc is unshared — its stale room membership is cleared.
    expect(await db.shares.get('d1')).toBeUndefined();

    const restored = await db.docs.get('d1');
    expect(restored).toBeDefined();
    const seed = rows[0]?.payload ?? new Uint8Array();
    expect(seedText(seed)).toBe(seedText(seedFromLexicalJson('d1', restored?.body ?? '')));
  });

  it('restores a space that has no docs and no inspector config', async () => {
    await db.spaces.put({ ...sampleSpace, id: 's3', name: 'Sparse' });
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s3'), WHEN);
    await db.spaces.update('s3', { name: 'Sparse Renamed' });
    await restoreSpaceArchive('s3', await parseSpaceArchive(blob));
    const after = await readSpaceSnapshot('s3');
    expect(after.space.name).toBe('Sparse');
    expect(after.docs).toEqual([]);
    expect(after.docInspectorConfig).toBeNull();
  });

  it('refuses to restore an archive from a different space', async () => {
    await db.spaces.put({ ...sampleSpace, id: 's2', name: 'Other' });
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    const archive = await parseSpaceArchive(blob);
    await expect(restoreSpaceArchive('s2', archive)).rejects.toThrow(
      /different space/,
    );
  });

  it('refuses to restore into a space that no longer exists', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    const archive = await parseSpaceArchive(blob);
    await db.spaces.delete('s1');
    await expect(restoreSpaceArchive('s1', archive)).rejects.toThrow(/not found/);
  });
});
