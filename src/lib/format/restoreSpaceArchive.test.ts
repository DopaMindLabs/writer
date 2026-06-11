import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';
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

  it('bumps the restore nonce for every restored doc', async () => {
    const blob = await buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);
    expect(useUI.getState().restoreNonces.d1).toBeUndefined();
    await restoreSpaceArchive('s1', await parseSpaceArchive(blob));
    expect(useUI.getState().restoreNonces.d1).toBe(1);
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
