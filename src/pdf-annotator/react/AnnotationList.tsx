import type { ReactNode } from 'react';
import { AnnotationListRow } from './AnnotationListRow';
import type { AnnotatorAnnotation } from '../core/types';

const GROUP_HEADER = 'px-5 pb-1 pt-3.5 font-mono text-[10px] uppercase tracking-wider text-ink-2';

export interface AnnotationListProps {
  annotations: AnnotatorAnnotation[];
  colorBorderClassName: (colorId: string) => string;
  formatGroupLabel: (page: number) => string;
  formatTimestamp: (annotation: AnnotatorAnnotation) => string;
  onActivate: (annotation: AnnotatorAnnotation) => void;
  emptySlot?: ReactNode;
}

/** Groups annotations by page (ascending), each group ordered by creation time. */
const groupByPage = (annotations: AnnotatorAnnotation[]): [number, AnnotatorAnnotation[]][] => {
  const byPage = new Map<number, AnnotatorAnnotation[]>();
  for (const annotation of annotations) {
    const group = byPage.get(annotation.page) ?? [];
    group.push(annotation);
    byPage.set(annotation.page, group);
  }
  return [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([page, group]) => [page, [...group].sort((a, b) => a.createdAt - b.createdAt)]);
};

/**
 * The quiet highlights-and-notes list: hairline rows grouped by page, no search
 * or chips. Existing marks are managed on the page (the context menu), so no
 * delete buttons appear here. Renders `emptySlot` when there is nothing.
 */
export const AnnotationList = ({
  annotations,
  colorBorderClassName,
  formatGroupLabel,
  formatTimestamp,
  onActivate,
  emptySlot,
}: AnnotationListProps) => {
  if (annotations.length === 0) return <>{emptySlot}</>;

  return (
    <div data-testid="annotation-list">
      {groupByPage(annotations).map(([page, group]) => (
        <section key={page}>
          <h3 className={GROUP_HEADER}>{formatGroupLabel(page)}</h3>
          {group.map((annotation) => (
            <AnnotationListRow
              key={annotation.id}
              annotation={annotation}
              colorBorderClassName={colorBorderClassName}
              formatTimestamp={formatTimestamp}
              onActivate={onActivate}
            />
          ))}
        </section>
      ))}
    </div>
  );
};
