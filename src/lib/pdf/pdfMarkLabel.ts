import type { AnnotatorAnnotation } from '@/pdf-annotator/core/types';

/** The minimal translator shape the label needs — the app threads i18next's `t`. */
export type MarkTranslate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Builds an annotation mark's accessible name from the `screens` translations.
 * The quote is truncated to 80 characters so a long selection can't bloat the
 * label. Passed to the annotator module as its `getMarkLabel`, keeping i18n on
 * the app side of the module boundary.
 */
export const getPdfMarkLabel = (
  t: MarkTranslate,
  annotation: AnnotatorAnnotation,
): string =>
  t('pdfHighlight.markAria', {
    color: t(`pdfHighlight.colors.${annotation.color}`),
    quote: annotation.quote.slice(0, 80),
  });
