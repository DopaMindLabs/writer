import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { readSpaceSnapshot } from '@/lib/backup/buildSpaceMarkdownZip';
import { FIXED_TIME, seedRichSpace } from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';
import { importSpaceArchive } from './importSpaceArchive';
import { parseMediaItemRecord } from './codecs';

const WHEN = 1704067200000;
const MEDIA_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3, 4, 5]);

const seedMedia = async (): Promise<void> => {
  await db.media.put({
    id: 'm1',
    spaceId: 's1',
    name: 'Paper.pdf',
    mime: 'application/pdf',
    size: MEDIA_BYTES.byteLength,
    pageCount: 3,
    blob: new Blob([MEDIA_BYTES], { type: 'application/pdf' }),
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
};

const archiveBlob = async (): Promise<Blob> =>
  buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);

describe('media in the space archive', () => {
  beforeEach(async () => {
    await seedRichSpace();
    await seedMedia();
  });

  it('round-trips a media item and its bytes through export and parse', async () => {
    const parsed = await parseSpaceArchive(await archiveBlob());
    expect(parsed.manifest.counts.media).toBe(1);
    expect(parsed.media).toHaveLength(1);
    const media = parsed.media[0];
    expect(media.id).toBe('m1');
    expect(media.name).toBe('Paper.pdf');
    expect(media.pageCount).toBe(3);
    expect(media.mime).toBe('application/pdf');
    const bytes = new Uint8Array(await media.blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(MEDIA_BYTES));
  });

  it('imports media into a new space with a remapped id and intact bytes', async () => {
    const { spaceId } = await importSpaceArchive(
      await parseSpaceArchive(await archiveBlob()),
    );
    expect(spaceId).not.toBe('s1');
    const imported = await db.media.where('spaceId').equals(spaceId).toArray();
    expect(imported).toHaveLength(1);
    expect(imported[0].id).not.toBe('m1');
    expect(imported[0].name).toBe('Paper.pdf');
    const bytes = new Uint8Array(await imported[0].blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(MEDIA_BYTES));
  });

  it('rejects a media record with a non-pdf mime', () => {
    expect(() =>
      parseMediaItemRecord({
        id: 'm',
        spaceId: 's',
        name: 'x',
        mime: 'text/plain',
        size: 1,
        pageCount: 1,
        createdAt: 1,
        updatedAt: 1,
        assetPath: 'a',
      }),
    ).toThrow(/media\.mime/);
  });
});
