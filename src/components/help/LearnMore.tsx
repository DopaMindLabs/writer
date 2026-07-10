import { useTranslation } from 'react-i18next';
import { HelpCircle } from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';

export interface LearnMoreProps {
  readonly slug: string;
  readonly anchor?: string;
  readonly label?: string;
  readonly className?: string;
}

export const LearnMore = ({ slug, anchor, label, className }: LearnMoreProps) => {
  const { t } = useTranslation('common');
  return (
    <Link
      to={routes.helpArticle(slug, anchor)}
      data-testid="learn-more"
      className={cn(
        'inline-flex items-center gap-1 text-[12px] text-ink-3 underline decoration-rule underline-offset-2 hover:text-ink hover:decoration-ink',
        className,
      )}
    >
      <HelpCircle className="h-3 w-3" aria-hidden />
      {label ?? t('help')}
    </Link>
  );
};
