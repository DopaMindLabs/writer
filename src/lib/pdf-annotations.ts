import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import type { PdfAnnotation } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';
import type { PdfSelectionCapture } from '@/lib/pdf/pdfGeometry';
import { getProfile } from '@/lib/account/profile';

export const addPdfHighlight = async (input: {
  mediaId: string;
  spaceId: string;
  capture: PdfSelectionCapture;
  color: HighlightColor;
}): Promise<PdfAnnotation> => {
  invariant(input.mediaId.length > 0, 'addPdfHighlight: mediaId required');
  invariant(input.spaceId.length > 0, 'addPdfHighlight: spaceId required');
  invariant(input.capture.rects.length > 0, 'addPdfHighlight: rects required');
  const { authorId } = await getProfile();
  const now = Date.now();
  const annotation: PdfAnnotation = {
    id: newId(),
    mediaId: input.mediaId,
    spaceId: input.spaceId,
    kind: 'highlight',
    page: input.capture.page,
    rects: input.capture.rects,
    quote: input.capture.quote,
    color: input.color,
    author: authorId,
    createdAt: now,
    updatedAt: now,
  };
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
