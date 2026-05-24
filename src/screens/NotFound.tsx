import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  TypographyH1,
  TypographyLabel,
  TypographyMuted,
} from '@/components/ui/typography';

export const NotFoundScreen = () => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex h-full items-center justify-center text-ink">
      <div className="text-center">
        <TypographyLabel variant="xs">{t('notFound.code')}</TypographyLabel>
        <TypographyH1 variant="simple" className="mt-2">
          {t('notFound.title')}
        </TypographyH1>
        <TypographyMuted className="mt-2">
          {t('notFound.body')}
        </TypographyMuted>
        <Button asChild className="mt-6">
          <Link to="/">{t('notFound.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
};
