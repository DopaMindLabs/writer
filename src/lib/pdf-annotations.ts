import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import type { PdfAnnotation, PdfAnnotationKind, PdfRect } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';
import type { PdfSelectionCapture } from '@/pdf-annotator/core/types';
import { getProfile } from '@/lib/account/profile';

/** The bounding box that encloses every rect, in page-fraction coordinates. */
const unionBox = (rects: PdfRect[]): PdfRect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
};

/** Intersection area as a fraction of the smaller box (0 = disjoint, 1 = contained). */
const overlapRatio = (a: PdfRect, b: PdfRect): number => {
  const iw = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const ih = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const minArea = Math.min(a.w * a.h, b.w * b.h);
  return minArea > 0 ? (iw * ih) / minArea : 0;
};

/** A new mark supersedes an existing same-kind mark it overlaps by more than half. */
const OVERRIDE_THRESHOLD = 0.5;

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

  // Paint-over: re-marking the same text replaces the same-kind mark underneath
  // rather than stacking (overlapping fills would blend into muddy colour). The
  // latest mark wins its colour/kind, but inherits the superseded mark's note so
  // recolouring an annotated highlight never drops the note.
  const box = unionBox(input.capture.rects);
  const existing = await db.pdfAnnotations.where('mediaId').equals(input.mediaId).toArray();
  const superseded = existing.filter(
    (a) =>
      a.kind === kind &&
      a.page === input.capture.page &&
      overlapRatio(unionBox(a.rects), box) > OVERRIDE_THRESHOLD,
  );
  const inheritedNote = superseded
    .filter((a) => a.note)
    .sort((a, b) => b.createdAt - a.createdAt)[0]?.note;
  const trimmed = input.note?.trim();
  const note = trimmed && trimmed.length > 0 ? trimmed : inheritedNote;

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

  if (superseded.length > 0) {
    await db.pdfAnnotations.bulkDelete(superseded.map((a) => a.id));
  }
  await db.pdfAnnotations.add(annotation);
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
