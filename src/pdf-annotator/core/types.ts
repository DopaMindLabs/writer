/** A rectangle on a PDF page, normalised to the page box as fractions in [0, 1]. */
export interface PdfRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The mark kinds the annotator can render. Only `highlight` is written until PE.4. */
export type AnnotationKind = 'highlight' | 'underline' | 'strikethrough';

/**
 * A text selection captured from a rendered PDF page: the 1-based page number
 * (matching react-pdf's `pageNumber`), the selection rectangles normalised to
 * the page box, and the selected text. Coordinates are resolution-independent so
 * a highlight re-projects correctly at any zoom.
 */
export interface SelectionCapture {
  page: number;
  rects: PdfRect[];
  quote: string;
}

/**
 * The minimal annotation shape the module renders. The app's `PdfAnnotation`
 * satisfies it, so the module never imports the db schema (dependency inversion).
 */
export interface AnnotatorAnnotation {
  id: string;
  kind: AnnotationKind;
  page: number;
  rects: PdfRect[];
  quote: string;
  color: string;
  note?: string;
  createdAt: number;
}

/** Legacy alias; call sites migrate to {@link SelectionCapture} opportunistically. */
export type PdfSelectionCapture = SelectionCapture;
