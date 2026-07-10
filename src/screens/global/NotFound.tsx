import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import {
  TypographyH1,
  TypographyLabel,
  TypographyMuted,
} from '@/components/ui/typography';
import { routes } from '@/lib/routes';

export const NotFoundScreen = () => {
  const { t } = useTranslation('screens');
  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="flex h-full items-center justify-center text-ink"
    >
      <div className="text-center">
        <TypographyLabel variant="xs">{t('notFound.code')}</TypographyLabel>
        <TypographyH1 variant="simple" className="mt-2">
          {t('notFound.title')}
        </TypographyH1>
        <TypographyMuted className="mt-2">
          {t('notFound.body')}
        </TypographyMuted>
        <Link to={routes.home()} kind="primary" className="mt-6">
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  );
};
