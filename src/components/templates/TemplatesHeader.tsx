import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';

/** The New-space screen header: a back link home and the screen label. */
export const TemplatesHeader = () => {
  const { t } = useTranslation('screens');
  return (
    <header className="flex items-center justify-between border-b border-rule px-4 py-3 md:px-12 md:py-5">
      <Link
        data-testid="templates-back"
        to={routes.home()}
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('templates.back')}
      </Link>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('templates.newSpace')}
      </div>
    </header>
  );
};
