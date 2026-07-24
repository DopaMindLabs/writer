import type { AnnotatorAnnotation } from '../core/types';

const ROW = 'block w-full border-l-[3px] pl-[17px] pr-5 py-3 text-left';
const QUOTE = 'block font-serif text-sm text-ink line-clamp-2';
const NOTE = 'mt-1 block font-serif text-sm italic text-ink-2';
const META = 'mt-1 block font-mono text-[10px] uppercase tracking-wider text-ink-2';

export interface AnnotationListRowProps {
  annotation: AnnotatorAnnotation;
  colorBorderClassName: (colorId: string) => string;
  formatTimestamp: (annotation: AnnotatorAnnotation) => string;
  onActivate: (annotation: AnnotatorAnnotation) => void;
}

/**
 * One annotation entry: a hairline row with a 3px colour left-border, the quote
 * clamped to two lines, an optional `↳ note` line (which also tints the row with
 * the off ground), and a mono micro-caps timestamp. The whole row is a button.
 */
export const AnnotationListRow = ({
  annotation,
  colorBorderClassName,
  formatTimestamp,
  onActivate,
}: AnnotationListRowProps) => (
  <button
    type="button"
    data-testid="annotation-row"
    data-annotation-id={annotation.id}
    aria-label={annotation.quote.slice(0, 80)}
    className={`${ROW} ${colorBorderClassName(annotation.color)} ${
      annotation.note ? 'bg-paper-2' : ''
    }`}
    onClick={() => {
      onActivate(annotation);
    }}
  >
    <span className={QUOTE}>{annotation.quote}</span>
    {annotation.note ? <span className={NOTE}>↳ {annotation.note}</span> : null}
    <span className={META}>{formatTimestamp(annotation)}</span>
  </button>
);
