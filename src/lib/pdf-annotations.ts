import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import type { PdfAnnotation, PdfAnnotationKind, PdfRect } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';
import type { PdfSelectionCapture } from '@/pdf-annotator/core/types';
import { trimRects, rectsOverlap } from '@/pdf-annotator/core/rectSplit';
import { getProfile } from '@/lib/account/profile';

interface SplitPlan {
  /** Marks the new highlight fully covers — removed; their notes can be inherited. */
  removed: PdfAnnotation[];
  /** Marks it partly covers — trimmed to the rects the new highlight leaves behind. */
  trimmed: { id: string; rects: PdfRect[] }[];
}

/**
 * Plans the overlap split (macOS-Preview-style recolour): a new highlight claims
 * the region it overlaps, and each same-kind mark underneath keeps only the rects
 * the new one does not cover. A mark trimmed to nothing was fully covered and is
 * removed; one with rects left is trimmed in place. This replaces the old
 * bounding-box "supersede over 50%" rule, so extending or recolouring part of a
 * highlight no longer wipes the rest.
 */
const planSplit = (
  existing: PdfAnnotation[],
  kind: PdfAnnotationKind,
  page: number,
  newRects: PdfRect[],
): SplitPlan => {
  const removed: PdfAnnotation[] = [];
  const trimmed: { id: string; rects: PdfRect[] }[] = [];
  for (const mark of existing) {
    if (mark.kind !== kind || mark.page !== page || !rectsOverlap(mark.rects, newRects)) continue;
    const remaining = trimRects(mark.rects, newRects);
    if (remaining.length === 0) removed.push(mark);
    else trimmed.push({ id: mark.id, rects: remaining });
  }
  return { removed, trimmed };
};

export const addPdfHighlight = async (input: {
  mediaId: string;
  spaceId: string;
  capture: PdfSelectionCapture;
  color: HighlightColor;
  /** Defaults to `highlight`; the selection strip also writes underline/strikethrough. */
  kind?: PdfAnnotationKind;
  note?: string;
}): Promise<PdfAnnotation> => {
  invariant(input.mediaId.length > 0, 'addPdfHighlight: mediaId required');
  invariant(input.spaceId.length > 0, 'addPdfHighlight: spaceId required');
  invariant(input.capture.rects.length > 0, 'addPdfHighlight: rects required');
  const { authorId } = await getProfile();
  const now = Date.now();
  const kind = input.kind ?? 'highlight';

  const existing = await db.pdfAnnotations.where('mediaId').equals(input.mediaId).toArray();
  const { removed, trimmed } = planSplit(existing, kind, input.capture.page, input.capture.rects);

  // A fully-covered mark's note carries onto the new highlight, so recolouring an
  // annotated highlight in place never drops its note; an explicit note wins.
  const inheritedNote = removed
    .filter((a) => a.note)
    .sort((a, b) => b.createdAt - a.createdAt)[0]?.note;
  const explicitNote = input.note?.trim();
  const note = explicitNote && explicitNote.length > 0 ? explicitNote : inheritedNote;

  const annotation: PdfAnnotation = {
    id: newId(),
    mediaId: input.mediaId,
    spaceId: input.spaceId,
    kind,
    page: input.capture.page,
    rects: input.capture.rects,
    quote: input.capture.quote,
    color: input.color,
    ...(note ? { note } : {}),
    author: authorId,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction('rw', db.pdfAnnotations, async () => {
    if (removed.length > 0) await db.pdfAnnotations.bulkDelete(removed.map((a) => a.id));
    await Promise.all(
      trimmed.map((mark) => db.pdfAnnotations.update(mark.id, { rects: mark.rects, updatedAt: now })),
    );
    await db.pdfAnnotations.add(annotation);
  });
  return annotation;
};

export const listPdfAnnotations = async (
  mediaId: string,
): Promise<PdfAnnotation[]> => {
  const items = await db.pdfAnnotations.where('mediaId').equals(mediaId).toArray();
  return items.sort((a, b) => a.page - b.page || a.createdAt - b.createdAt);
};

export const setPdfAnnotationColor = async (
  id: string,
  color: HighlightColor,
): Promise<void> => {
  await db.pdfAnnotations.update(id, { color, updatedAt: Date.now() });
};

export const setPdfAnnotationNote = async (
  id: string,
  note: string,
): Promise<void> => {
  const trimmed = note.trim();
  const updatedAt = Date.now();
  // Dexie's object-form update ignores undefined, so clear via a modify callback.
  await db.pdfAnnotations
    .where('id')
    .equals(id)
    .modify((annotation) => {
      annotation.updatedAt = updatedAt;
      if (trimmed === '') delete annotation.note;
      else annotation.note = trimmed;
    });
};

export const deletePdfAnnotation = async (id: string): Promise<void> => {
  await db.pdfAnnotations.delete(id);
};
