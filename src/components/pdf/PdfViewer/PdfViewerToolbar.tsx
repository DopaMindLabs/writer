import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface PdfViewerToolbarProps {
  pageNumber: number;
  numPages: number;
  canPrev: boolean;
  canNext: boolean;
  canZoomOut: boolean;
  canZoomIn: boolean;
  onPrev: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  extras?: ReactNode;
}

/** Page navigation, zoom, and a slot the highlighter controls mount into. */
export const PdfViewerToolbar = ({
  pageNumber,
  numPages,
  canPrev,
  canNext,
  canZoomOut,
  canZoomIn,
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  extras,
}: PdfViewerToolbarProps) => {
  const { t } = useTranslation('screens');

  return (
    <div
      data-testid="pdf-toolbar"
      className="flex items-center gap-1 border-b border-rule bg-paper px-3 py-2"
    >
      <IconButton
        icon={ChevronLeft}
        label={t('mediaLibrary.viewer.prevPage')}
        onClick={onPrev}
        disabled={!canPrev}
      />
      <IconButton
        icon={ChevronRight}
        label={t('mediaLibrary.viewer.nextPage')}
        onClick={onNext}
        disabled={!canNext}
      />
      <Eyebrow
        aria-live="polite"
        data-testid="pdf-page-readout"
        className="min-w-[8ch] px-2 text-center"
      >
        {t('mediaLibrary.viewer.pageReadout', { page: pageNumber, total: numPages })}
      </Eyebrow>
      <div className="ml-auto flex items-center gap-1">
        {extras}
        <IconButton
          icon={ZoomOut}
          label={t('mediaLibrary.viewer.zoomOut')}
          onClick={onZoomOut}
          disabled={!canZoomOut}
        />
        <IconButton
          icon={ZoomIn}
          label={t('mediaLibrary.viewer.zoomIn')}
          onClick={onZoomIn}
          disabled={!canZoomIn}
        />
      </div>
    </div>
  );
};
