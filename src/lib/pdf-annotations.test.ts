import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import type { PdfSelectionCapture } from '@/lib/pdf/pdfGeometry';
import {
  addPdfHighlight,
  listPdfAnnotations,
  setPdfAnnotationColor,
  setPdfAnnotationNote,
  deletePdfAnnotation,
} from './pdf-annotations';

const capture = (page: number): PdfSelectionCapture => ({
  page,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: 'q',
});

const add = (page = 1) =>
  addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: capture(page), color: 'yellow' });

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('pdf-annotations facade', () => {
  it('addPdfHighlight stamps kind, author and timestamps', async () => {
    const hl = await add();
    expect(hl.kind).toBe('highlight');
    expect(hl.author.length).toBeGreaterThan(0);
    expect(hl.createdAt).toBeGreaterThan(0);
    expect(await db.pdfAnnotations.get(hl.id)).toBeDefined();
  });

  it('listPdfAnnotations sorts by page then createdAt', async () => {
    await db.pdfAnnotations.bulkAdd([
      { id: 'b', mediaId: 'm1', spaceId: 's1', kind: 'highlight', page: 2, rects: [{ x: 0, y: 0, w: 0.1, h: 0.1 }], quote: '', color: 'yellow', author: 'me', createdAt: 5, updatedAt: 5 },
      { id: 'a', mediaId: 'm1', spaceId: 's1', kind: 'highlight', page: 1, rects: [{ x: 0, y: 0, w: 0.1, h: 0.1 }], quote: '', color: 'yellow', author: 'me', createdAt: 9, updatedAt: 9 },
      { id: 'c', mediaId: 'm1', spaceId: 's1', kind: 'highlight', page: 2, rects: [{ x: 0, y: 0, w: 0.1, h: 0.1 }], quote: '', color: 'yellow', author: 'me', createdAt: 1, updatedAt: 1 },
    ]);
    const list = await listPdfAnnotations('m1');
    expect(list.map((h) => h.id)).toEqual(['a', 'c', 'b']);
  });

  it('setPdfAnnotationColor updates the colour', async () => {
    const hl = await add();
    await setPdfAnnotationColor(hl.id, 'green');
    expect((await db.pdfAnnotations.get(hl.id))?.color).toBe('green');
  });

  it('setPdfAnnotationNote sets a trimmed note and clears it with an empty string', async () => {
    const hl = await add();
    await setPdfAnnotationNote(hl.id, '  hello  ');
    expect((await db.pdfAnnotations.get(hl.id))?.note).toBe('hello');
    await setPdfAnnotationNote(hl.id, '   ');
    expect((await db.pdfAnnotations.get(hl.id))?.note).toBeUndefined();
  });

  it('deletePdfAnnotation removes it', async () => {
    const hl = await add();
    await deletePdfAnnotation(hl.id);
    expect(await db.pdfAnnotations.get(hl.id)).toBeUndefined();
  });
});
