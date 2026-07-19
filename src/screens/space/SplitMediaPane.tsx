import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from '@/components/libs/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { TypographyP } from '@/components/ui/typography';
import { usePdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { useMediaItem } from '@/hooks/useMediaItem';
import { PdfReaderSurface } from './PdfReaderSurface';

interface SplitMediaPaneProps {
  spaceId: string;
  mediaId: string;
  /** Returns the pane to the library list (the pane stays a pane throughout). */
  onBackToLibrary: () => void;
}

/**
 * A PDF opened inside the split view's right pane: a slim header with the
 * back-to-library affordance and the file name, then the full reader surface —
 * so opening a document from the library pane never navigates away from the
 * split. Owns its own viewport (the pane has no topbar crumb to feed).
 */
export const SplitMediaPane = ({
  spaceId,
  mediaId,
  onBackToLibrary,
}: SplitMediaPaneProps) => {
  const { t } = useTranslation('screens');
  const item = useMediaItem(mediaId);
  const view = usePdfViewport();

  if (item === undefined) return null;

  const backButton = (
    <Button
      kind="ghost"
      size="sm"
      onClick={onBackToLibrary}
      data-testid="split-media-back"
      aria-label={t('mediaViewer.back')}
      className="inline-flex h-7 items-center gap-1 border-0 px-1 text-ink-3 hover:bg-paper-2 hover:text-ink"
    >
      <Icon icon={ArrowLeft} size="xs" />
      {t('mediaViewer.back')}
    </Button>
  );

  if (item === null) {
    return (
      <div data-testid="split-media-missing" className="p-6">
        {backButton}
        <EmptyState
          title={t('mediaViewer.missingTitle')}
          caption={t('mediaViewer.missingCaption')}
        />
      </div>
    );
  }

  return (
    <div data-testid="split-media-pane" className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-rule bg-paper-2 px-3">
        {backButton}
        <TypographyP variant="body" title={item.name} className="truncate text-ink">
          {item.name}
        </TypographyP>
      </div>
      <PdfReaderSurface spaceId={spaceId} item={item} view={view} />
    </div>
  );
};
