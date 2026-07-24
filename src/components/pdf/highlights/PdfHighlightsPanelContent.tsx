import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnnotationList, borderRecipe, type AnnotatorAnnotation } from '@/pdf-annotator';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePdfAnnotations } from '@/hooks/usePdfAnnotations';
import { formatAnnotationTimestamp } from '@/lib/pdf/annotationTimestamp';
import type { HighlightColor } from '@/theme/tokens';

interface PdfHighlightsPanelContentProps {
  mediaId: string;
  /** Moves the viewer to a page; the reader supplies this in Stage PG. */
  onNavigateToPage?: (page: number) => void;
  /** Task PD.4 fills this with the "+ add to brain space" action. */
  footerSlot?: ReactNode;
}

/**
 * The Highlights & notes panel body: the quiet grouped list plus an empty state,
 * bound to the live annotations. Activating a row moves the reader to that page
 * and focuses the mark. Stage PG mounts this inside the reader rail's panel.
 */
export const PdfHighlightsPanelContent = ({
  mediaId,
  onNavigateToPage,
  footerSlot,
}: PdfHighlightsPanelContentProps) => {
  const { t } = useTranslation('screens');
  const annotations = usePdfAnnotations(mediaId);

  const onActivate = (annotation: AnnotatorAnnotation): void => {
    onNavigateToPage?.(annotation.page);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-highlight-id="${annotation.id}"]`)
        ?.focus();
    });
  };

  return (
    <div data-testid="pdf-highlights-panel">
      <AnnotationList
        annotations={annotations}
        colorBorderClassName={(id) => borderRecipe({ color: id as HighlightColor })}
        formatGroupLabel={(page) => t('pdfHighlights.pageLabel', { page })}
        formatTimestamp={(annotation) =>
          formatAnnotationTimestamp(annotation.createdAt, Boolean(annotation.note), new Date())
        }
        onActivate={onActivate}
        emptySlot={<EmptyState caption={t('pdfHighlights.emptyCaption')} />}
      />
      {footerSlot}
    </div>
  );
};
