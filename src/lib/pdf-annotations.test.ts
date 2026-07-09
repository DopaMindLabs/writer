import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import type { PdfSelectionCapture } from '@/pdf-annotator/core/types';
import {
  addPdfHighlight,
  listPdfAnnotations,
  countPdfAnnotationsBySpace,
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

  it('countPdfAnnotationsBySpace tallies per media, scoped to the space', async () => {
    await db.pdfAnnotations.bulkAdd([
      { id: '1', mediaId: 'm1', spaceId: 's1', kind: 'highlight', page: 1, rects: SPAN, quote: '', color: 'yellow', author: 'me', createdAt: 1, updatedAt: 1 },
      { id: '2', mediaId: 'm1', spaceId: 's1', kind: 'highlight', page: 2, rects: SPAN, quote: '', color: 'yellow', author: 'me', createdAt: 2, updatedAt: 2 },
      { id: '3', mediaId: 'm2', spaceId: 's1', kind: 'highlight', page: 1, rects: SPAN, quote: '', color: 'yellow', author: 'me', createdAt: 3, updatedAt: 3 },
      { id: '4', mediaId: 'm3', spaceId: 's2', kind: 'highlight', page: 1, rects: SPAN, quote: '', color: 'yellow', author: 'me', createdAt: 4, updatedAt: 4 },
    ]);
    const counts = await countPdfAnnotationsBySpace('s1');
    expect(counts.get('m1')).toBe(2);
    expect(counts.get('m2')).toBe(1);
    // A different space's marks are excluded; an unannotated media is absent.
    expect(counts.has('m3')).toBe(false);
    expect([...counts.keys()].sort()).toEqual(['m1', 'm2']);
  });

  const at = (
    rects: PdfSelectionCapture['rects'],
    quote = 'q',
  ): PdfSelectionCapture => ({ page: 1, rects, quote });
  const SPAN = [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }];
  const ELSEWHERE = [{ x: 0.1, y: 0.8, w: 0.2, h: 0.05 }];

  it('a new highlight overrides an overlapping same-kind highlight', async () => {
    const first = await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'yellow' });
    const second = await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'green' });
    const all = await listPdfAnnotations('m1');
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(second.id);
    expect(all[0].color).toBe('green');
    expect(await db.pdfAnnotations.get(first.id)).toBeUndefined();
  });

  it('the overriding highlight inherits the superseded note', async () => {
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'yellow', note: 'keep me' });
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'green' });
    const all = await listPdfAnnotations('m1');
    expect(all).toHaveLength(1);
    expect(all[0].note).toBe('keep me');
  });

  it('keeps an explicit note over the inherited one', async () => {
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'yellow', note: 'old' });
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'green', note: 'new' });
    expect((await listPdfAnnotations('m1'))[0].note).toBe('new');
  });

  it('leaves a non-overlapping highlight intact', async () => {
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN, 'a'), color: 'yellow' });
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(ELSEWHERE, 'b'), color: 'green' });
    expect(await listPdfAnnotations('m1')).toHaveLength(2);
  });

  it('recolours only the overlap and keeps the rest of the highlight', async () => {
    // Yellow spans x 0.1..0.5; green recolours the middle 0.2..0.3 (Preview-style).
    const yellow = await addPdfHighlight({
      mediaId: 'm1', spaceId: 's1', color: 'yellow',
      capture: at([{ x: 0.1, y: 0.1, w: 0.4, h: 0.05 }]),
    });
    await addPdfHighlight({
      mediaId: 'm1', spaceId: 's1', color: 'green',
      capture: at([{ x: 0.2, y: 0.1, w: 0.1, h: 0.05 }]),
    });
    const all = await listPdfAnnotations('m1');
    expect(all).toHaveLength(2);
    const kept = all.find((a) => a.color === 'yellow');
    const middle = all.find((a) => a.color === 'green');
    // The yellow mark is trimmed in place (same id), split into a left and right strip.
    expect(kept?.id).toBe(yellow.id);
    expect(kept?.rects).toHaveLength(2);
    expect(middle?.rects).toHaveLength(1);
  });

  it('trims the old mark at the seam when a new highlight extends past it', async () => {
    // Old covers x 0.1..0.3; new covers 0.2..0.5 — overlaps the right half and runs on.
    await addPdfHighlight({
      mediaId: 'm1', spaceId: 's1', color: 'yellow',
      capture: at([{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }]),
    });
    await addPdfHighlight({
      mediaId: 'm1', spaceId: 's1', color: 'green',
      capture: at([{ x: 0.2, y: 0.1, w: 0.3, h: 0.05 }]),
    });
    const all = await listPdfAnnotations('m1');
    expect(all).toHaveLength(2);
    const kept = all.find((a) => a.color === 'yellow');
    expect(kept?.rects).toHaveLength(1);
    // Yellow keeps only its left strip, 0.1..0.2.
    expect(Number(kept?.rects[0].w.toFixed(5))).toBe(0.1);
  });

  it('lets a different-kind mark over a highlight coexist', async () => {
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'yellow' });
    await addPdfHighlight({ mediaId: 'm1', spaceId: 's1', capture: at(SPAN), color: 'green', kind: 'underline' });
    const all = await listPdfAnnotations('m1');
    expect(all).toHaveLength(2);
    expect(all.map((a) => a.kind).sort()).toEqual(['highlight', 'underline']);
  });
});
