import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { NoteKind, NoteState } from '@/db/schema';
import { readSpaceSnapshot } from '@/lib/backup/buildSpaceMarkdownZip';
import { FIXED_TIME, seedRichSpace } from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';
import { importSpaceArchive } from './importSpaceArchive';
import { parseMediaItemRecord, parsePdfAnnotationRecord } from './codecs';

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
    openedAt: FIXED_TIME + 60_000,
  });
  await db.pdfAnnotations.put({
    id: 'hl1',
    mediaId: 'm1',
    spaceId: 's1',
    kind: 'highlight',
    page: 2,
    rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
    quote: 'a highlighted sentence',
    color: 'pink',
    note: 'my note',
    author: 'me',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
  });
  await db.notes.put({
    id: 'n3',
    spaceId: 's1',
    l: 40,
    t: 40,
    w: 184,
    h: 80,
    kind: NoteKind.Note,
    state: NoteState.User,
    body: 'Sourced from the PDF',
    mediaId: 'm1',
    createdAt: FIXED_TIME,
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
    // The optional opened-at stamp round-trips when present.
    expect(media.openedAt).toBe(FIXED_TIME + 60_000);
    const bytes = new Uint8Array(await media.blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(MEDIA_BYTES));
  });

  it('round-trips a pdf highlight through export and parse', async () => {
    const parsed = await parseSpaceArchive(await archiveBlob());
    expect(parsed.manifest.counts.pdfAnnotations).toBe(1);
    expect(parsed.pdfAnnotations).toHaveLength(1);
    expect(parsed.pdfAnnotations[0]).toEqual({
      id: 'hl1',
      mediaId: 'm1',
      spaceId: 's1',
      kind: 'highlight',
      page: 2,
      rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
      quote: 'a highlighted sentence',
      color: 'pink',
      note: 'my note',
      author: 'me',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
  });

  it('imports media and highlights into a new space, remapping ids intact', async () => {
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

    // The highlight's mediaId must be remapped to the imported media item.
    const highlights = await db.pdfAnnotations.where('spaceId').equals(spaceId).toArray();
    expect(highlights).toHaveLength(1);
    expect(highlights[0].id).not.toBe('hl1');
    expect(highlights[0].mediaId).toBe(imported[0].id);
    expect(highlights[0].quote).toBe('a highlighted sentence');
  });

  it('preserves a note media link through export and parse', async () => {
    const parsed = await parseSpaceArchive(await archiveBlob());
    const sourced = parsed.notes.find((n) => n.id === 'n3');
    expect(sourced).toBeDefined();
    expect(sourced?.mediaId).toBe('m1');
  });

  it('remaps a note media link to the imported media item on import', async () => {
    const { spaceId } = await importSpaceArchive(
      await parseSpaceArchive(await archiveBlob()),
    );
    const media = await db.media.where('spaceId').equals(spaceId).toArray();
    const notes = await db.notes.where('spaceId').equals(spaceId).toArray();
    const sourced = notes.find((n) => n.mediaId !== undefined);
    expect(sourced).toBeDefined();
    // The link must point at the imported media item's fresh id, not the old one.
    expect(sourced?.mediaId).not.toBe('m1');
    expect(sourced?.mediaId).toBe(media[0].id);
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

  const validHighlight = {
    id: 'h',
    mediaId: 'm',
    spaceId: 's',
    kind: 'highlight',
    page: 1,
    rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
    quote: 'q',
    color: 'yellow',
    author: 'me',
    createdAt: 1,
    updatedAt: 1,
  };

  it('rejects a highlight with an unknown colour', () => {
    expect(() =>
      parsePdfAnnotationRecord({ ...validHighlight, color: 'crimson' }),
    ).toThrow(/pdfAnnotation\.color/);
  });

  it('rejects a highlight with an out-of-range rect', () => {
    expect(() =>
      parsePdfAnnotationRecord({
        ...validHighlight,
        rects: [{ x: 1.5, y: 0.1, w: 0.2, h: 0.05 }],
      }),
    ).toThrow(/pdfAnnotation\.rect\.x/);
  });

  it('rejects a highlight with no rects', () => {
    expect(() =>
      parsePdfAnnotationRecord({ ...validHighlight, rects: [] }),
    ).toThrow(/pdfAnnotation\.rects/);
  });

  it('accepts underline and strikethrough kinds', () => {
    expect(parsePdfAnnotationRecord({ ...validHighlight, kind: 'underline' }).kind).toBe(
      'underline',
    );
    expect(parsePdfAnnotationRecord({ ...validHighlight, kind: 'strikethrough' }).kind).toBe(
      'strikethrough',
    );
  });

  it('rejects an unknown kind', () => {
    expect(() =>
      parsePdfAnnotationRecord({ ...validHighlight, kind: 'scribble' }),
    ).toThrow(/pdfAnnotation\.kind/);
  });
});
