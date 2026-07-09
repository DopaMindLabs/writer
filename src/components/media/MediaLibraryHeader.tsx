import { useTranslation } from 'react-i18next';
import { TypographyH1 } from '@/components/ui/typography';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { MediaUploadButton } from './MediaUploadButton';
import type { MediaUpload } from '@/hooks/useMediaUpload';

interface MediaLibraryHeaderProps {
  spaceId: string;
  pdfCount: number;
  annotationCount: number;
  /** Shared upload controller so the button and the page-wide drop report
   * through one banner. */
  upload?: MediaUpload;
}

/** The library head: the title with a running PDF/annotation tally, and the
 * Add-PDF button. */
export const MediaLibraryHeader = ({
  spaceId,
  pdfCount,
  annotationCount,
  upload,
}: MediaLibraryHeaderProps) => {
  const { t } = useTranslation('screens');

  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <TypographyH1 variant="compact" id="media-library-heading">
          {t('mediaLibrary.heading')}
        </TypographyH1>
        <Eyebrow data-testid="media-library-counts" className="text-ink-4">
          {t('mediaLibrary.list.counts', {
            pdfs: pdfCount,
            annotations: annotationCount,
          })}
        </Eyebrow>
      </div>
      <MediaUploadButton spaceId={spaceId} upload={upload} />
    </header>
  );
};
