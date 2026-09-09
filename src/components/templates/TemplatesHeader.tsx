import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { eyebrowRecipe } from '@/components/ui/Eyebrow.recipe';
import { cn } from '@/lib/utils';

/** The New-space screen header: a back link home and the screen label. */
export const TemplatesHeader = () => {
  const { t } = useTranslation('screens');
  return (
    <header className="flex items-center justify-between border-b border-rule px-4 py-3 md:px-12 md:py-5">
      <Link
        data-testid="templates-back"
        to={routes.home()}
        className={cn(
          eyebrowRecipe(),
          'inline-flex items-center gap-1.5 hover:text-ink',
        )}
      >
        <ArrowLeft className="h-3 w-3" />
        {t('templates.back')}
      </Link>
      <Eyebrow>{t('templates.newSpace')}</Eyebrow>
    </header>
  );
};
