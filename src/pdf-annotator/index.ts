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
export { swatchRecipe, borderRecipe } from './react/swatchRecipe';
export { AnnotationList } from './react/AnnotationList';
export type { AnnotationListProps } from './react/AnnotationList';
export { SelectionStrip } from './react/SelectionStrip';
export type { SelectionStripProps } from './react/SelectionStrip';
export { computeStripPosition } from './react/stripPosition';
export type { StripPosition } from './react/stripPosition';
export type { StripColor, SelectionStripLabels } from './react/stripLabels';
export { SelectionStripNoteEditor } from './react/SelectionStripNoteEditor';
export type { SelectionStripNoteEditorProps } from './react/SelectionStripNoteEditor';
