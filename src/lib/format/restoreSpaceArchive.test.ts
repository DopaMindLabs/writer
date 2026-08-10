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
  sampleMetadata,
  sampleSpace,
  seedRichSpace,
  serializedBody,
} from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';
import { restoreSpaceArchive } from './restoreSpaceArchive';

const WHEN = 1704067200000;

/**
 * A snapshot reduced to the content a restore must reproduce exactly. The
 * convergence metadata is deliberately excluded: a restore is a material local
 * change, so every restored row is reminted (see the reminting test below) and
 * comparing those fields would assert the opposite of the intended behaviour.
 */
const CONVERGENCE_FIELDS = ['mutationId', 'logicalUpdatedAt'];

const comparable = (snapshot: SpaceSnapshot): unknown => {
  const content = (row: object): unknown =>
    Object.fromEntries(
      Object.entries(row).filter(([field]) => !CONVERGENCE_FIELDS.includes(field)),
    );
  return {
    ...snapshot,
    space: content(snapshot.space),
    sections: snapshot.sections.map(content),
    docs: snapshot.docs.map(content),
    notes: snapshot.notes.map(content),
    attachments: snapshot.attachments.map((a) => content({ ...a, blob: undefined })),
    annotations: snapshot.annotations.map(content),
    citations: snapshot.citations.map(content),
    connections: snapshot.connections.map(content),
    palettes: snapshot.palettes.map(content),
    revisions: snapshot.revisions.map(content),
    writerNotebooks: snapshot.writerNotebooks.map(content),
    writerNotebookPages: snapshot.writerNotebookPages.map(content),
    writerNotebookAssets: snapshot.writerNotebookAssets.map((asset) =>
      content({ ...asset, blob: undefined }),
    ),
  };
};

/**
 * Plain text of a CRDT seed payload's root shared type. Read structurally via
 * `toDelta()` — text lives in string inserts, formatting in attributes — so no
 * markup is ever rendered, and prose containing literal angle brackets
 * survives intact.
 */
const seedText = (payload: Uint8Array): string => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, payload, 'test');
  const ops = (doc.get('root', Y.XmlText) as Y.XmlText).toDelta() as readonly {
    readonly insert?: unknown;
  }[];
  doc.destroy();
  return ops.map((op) => (typeof op.insert === 'string' ? op.insert : '')).join('');
};

const mutateSpace = async (): Promise<void> => {
  await db.docs.update('d1', { body: serializedBody('Vandalised.'), updatedAt: 1 });
  await db.notes.delete('n2');
  await db.connections.delete('c1');
  await db.citations.add({
    ...sampleMetadata(),
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
    expect(await after.writerNotebookAssets[0].blob.text()).toBe('source-image');
    expect(await db.citations.get('cit-extra')).toBeUndefined();
  });

  it('remints every restored row so the restore replicates to other devices', async () => {
    const before = await readSpaceSnapshot('s1');
    const blob = await buildSpaceArchive(before, WHEN);

    await mutateSpace();
    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    // Re-putting the archived mutation ids would be journalled as operations
    // the other devices have already accepted: they would discard the restored
    // rows as replays and keep the deletions that preceded them.
    const after = await readSpaceSnapshot('s1');
    expect(after.space.mutationId).not.toBe(before.space.mutationId);
    for (const note of after.notes) {
      const archived = before.notes.find((candidate) => candidate.id === note.id);
      expect(note.mutationId).not.toBe(archived?.mutationId);
    }
    expect(after.space.createdBy).toBe(before.space.createdBy);
  });

  it('stores a pre-restore snapshot backup before replacing content', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    await mutateSpace();
    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    const backups = await db.backups.where('scope').equals('s1').toArray();
    expect(backups).toHaveLength(1);
    expect(backups[0].kind).toBe('snapshot');
    expect(backups[0].format).toBe('archive-v3');
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
    await mutateSpace();

    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));

    const rows = await db.docUpdates.where('docId').equals('d1').toArray();
    expect(rows).toHaveLength(1); // stale log cleared, exactly one fresh seed
    expect(await db.meta.get(collabSeedKey('d1'))).toBeDefined();

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
