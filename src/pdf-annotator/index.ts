export type {
  PdfRect,
  AnnotationKind,
  SelectionCapture,
  AnnotatorAnnotation,
  PdfSelectionCapture,
} from './core/types';
export {
  rectToNormalized,
  normalizedToPixels,
  clientRectsToNormalized,
  buildSelectionCapture,
} from './core/geometry';
export { resolveSelectionPage } from './core/selection';
export { useTextSelection } from './react/useTextSelection';
export { useAnnotator } from './react/useAnnotator';
export type { Annotator, AnnotatorCallbacks } from './react/useAnnotator';
export { AnnotationLayer } from './react/AnnotationLayer';
export { AnnotationMark } from './react/AnnotationMark';
export { swatchRecipe } from './react/swatchRecipe';
// PE.4/PE.6 append: SelectionStrip, SelectionStripNoteEditor, AnnotationList
