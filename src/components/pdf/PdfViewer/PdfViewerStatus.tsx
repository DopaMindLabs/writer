import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { TypographyP } from '@/components/ui/typography';

interface PdfViewerStatusProps {
  status: 'loading' | 'error';
  onRetry?: () => void;
}

/**
 * The viewer's non-ready states. Loading is a static, motion-free token skeleton
 * (the design system has no spinner); error is an `InlineBanner` whose retry
 * re-copies the bytes and re-parses the document.
 */
export const PdfViewerStatus = ({ status, onRetry }: PdfViewerStatusProps) => {
  const { t } = useTranslation('screens');

  if (status === 'error') {
    return (
      <div className="p-4" data-testid="pdf-status-error">
        <InlineBanner
          kind="error"
          title={t('mediaLibrary.viewer.errorTitle')}
          action={t('mediaLibrary.viewer.retry')}
          onAction={onRetry}
        >
          {t('mediaLibrary.viewer.errorBody')}
        </InlineBanner>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pdf-status-loading"
      className="flex flex-col items-center gap-3 p-8"
    >
      <div
        aria-hidden="true"
        className="h-[60vh] w-full max-w-[480px] border border-rule bg-paper-2"
      />
      <TypographyP variant="caption" className="text-ink-3">
        {t('mediaLibrary.viewer.loading')}
      </TypographyP>
    </div>
  );
};
