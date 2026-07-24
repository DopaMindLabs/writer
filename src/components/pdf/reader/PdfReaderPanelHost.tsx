import { useTranslation } from 'react-i18next';
import { PdfReaderPanel } from './PdfReaderPanel';
import { PdfInfoPanelContent } from './PdfInfoPanelContent';
import { PdfHighlightsPanelContent } from '@/components/pdf/highlights/PdfHighlightsPanelContent';
import type { PdfReaderPanel as PdfReaderPanelKind } from '@/store/ui';
import type { MediaItem } from '@/db/schema';

interface PdfReaderPanelHostProps {
  panel: PdfReaderPanelKind;
  item: MediaItem;
  annotationCount: number;
  onNavigateToPage: (page: number) => void;
}

/**
 * Picks the panel body for the current `panel` value and wraps it in the shared
 * shell: the highlights list, the document-info rows, or nothing. Keeps the
 * reader surface free of the per-panel branching.
 */
export const PdfReaderPanelHost = ({
  panel,
  item,
  annotationCount,
  onNavigateToPage,
}: PdfReaderPanelHostProps) => {
  const { t } = useTranslation('screens');

  if (panel === 'highlights') {
    return (
      <PdfReaderPanel title={t('pdfHighlights.title')} count={annotationCount}>
        <PdfHighlightsPanelContent mediaId={item.id} onNavigateToPage={onNavigateToPage} />
      </PdfReaderPanel>
    );
  }
  if (panel === 'info') {
    return (
      <PdfReaderPanel title={t('pdfReader.info')}>
        <PdfInfoPanelContent
          name={item.name}
          pageCount={item.pageCount}
          size={item.size}
          createdAt={item.createdAt}
          annotationCount={annotationCount}
        />
      </PdfReaderPanel>
    );
  }
  return null;
};
