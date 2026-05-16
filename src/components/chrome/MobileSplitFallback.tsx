import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface MobileSplitFallbackProps {
  spaceId: string;
  docId: string;
}

export function MobileSplitFallback({ spaceId, docId }: MobileSplitFallbackProps) {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid="mobile-split-fallback"
      className="flex h-full w-full flex-col items-center justify-center px-6 text-center md:hidden"
    >
      <div
        aria-hidden
        className="mb-6 flex h-[90px] w-[60px] flex-col items-stretch border border-rule"
      >
        <div className="flex-1 border-b border-rule" />
        <div className="flex-1" />
      </div>
      <h1 className="mb-3 font-serif text-[22px] font-medium tracking-tight text-ink">
        {t('mobileSplitFallback.title')}
      </h1>
      <p className="mb-6 max-w-[280px] font-serif text-[14px] italic text-ink-3">
        {t('mobileSplitFallback.body')}
      </p>
      <Link
        to={`/s/${spaceId}/d/${docId}`}
        className="inline-block border border-ink px-4 py-2 text-[12px] font-medium uppercase tracking-wider text-ink"
      >
        {t('mobileSplitFallback.cta')}
      </Link>
    </div>
  );
}
