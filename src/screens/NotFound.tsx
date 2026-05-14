import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function NotFoundScreen() {
  const { t } = useTranslation('screens');
  return (
    <div className="flex h-full items-center justify-center text-ink">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-3">{t('notFound.code')}</p>
        <h1 className="mt-2 font-serif text-3xl">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm text-ink-3">
          {t('notFound.body')}
        </p>
        <Button asChild className="mt-6">
          <Link to="/">{t('notFound.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
