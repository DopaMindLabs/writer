import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/icon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ZoomIn, ZoomOut } from '@/components/libs/icons';

interface PdfZoomControlProps {
  /** Current page scale (1 = 100%). */
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

/**
 * The quiet zoom cluster: zoom out, a mono percentage readout that resets to
 * 100% on click, and zoom in — floating at the bottom-right of the page column,
 * mirroring the pager's chassis. The visible counterpart to the rail overflow's
 * zoom items; navigation stays with the pager, this owns zoom only. `z-10` keeps
 * it above pdf.js's text layer (`z-index: 2`) so its clicks land.
 */
export const PdfZoomControl = ({
  scale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: PdfZoomControlProps) => {
  const { t } = useTranslation('screens');
  const pct = Math.round(scale * 100);

  return (
    <div
      data-testid="pdf-zoom"
      className="absolute bottom-5 right-5 z-10 flex items-center gap-1 rounded-sm border border-rule bg-paper px-1 py-0.5 shadow-sm"
    >
      <IconButton
        icon={ZoomOut}
        label={t('pdfReader.zoom.zoomOut')}
        data-testid="pdf-zoom-out"
        onClick={onZoomOut}
        disabled={!canZoomOut}
      />
      <button
        type="button"
        data-testid="pdf-zoom-reset"
        aria-label={t('pdfReader.zoom.reset', { pct })}
        onClick={onResetZoom}
        className="rounded-sm px-1 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
      >
        <Eyebrow asChild>
          <span>{pct}%</span>
        </Eyebrow>
      </button>
      <IconButton
        icon={ZoomIn}
        label={t('pdfReader.zoom.zoomIn')}
        data-testid="pdf-zoom-in"
        onClick={onZoomIn}
        disabled={!canZoomIn}
      />
    </div>
  );
};
