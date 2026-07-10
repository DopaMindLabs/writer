import { useTranslation } from 'react-i18next';
import {
  Brain,
  Columns2,
  Database,
  Highlighter,
  type LucideIcon,
  List,
  Pencil,
  Quote,
  Settings,
  Smartphone,
  Sparkles,
} from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import {
  getArticlesByCategory,
  HELP_CATEGORIES,
  type HelpCategory,
} from '@/lib/help/registry';
import { getHelpDoc } from '@/lib/help/content';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Pencil,
  List,
  Columns2,
  Quote,
  Brain,
  Highlighter,
  Settings,
  Database,
  Smartphone,
};

interface CategorySectionProps {
  readonly category: HelpCategory;
  readonly locale: string;
}

const CategorySection = ({ category, locale }: CategorySectionProps) => {
  const { t } = useTranslation('help');
  const Icon = CATEGORY_ICONS[category.icon] ?? List;
  const articles = getArticlesByCategory(category.id);
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        <Icon className="h-3 w-3" aria-hidden />
        {t(`categories.${category.id}`)}
      </div>
      <ul className="mt-1.5">
        {articles.map((article) => {
          const doc = getHelpDoc(article.slug, locale);
          if (!doc) return null;
          return (
            <li key={article.slug}>
              <Link
                to={routes.helpArticle(article.slug)}
                className={cn(
                  'block border-l-2 border-transparent py-1.5 pl-5 pr-3 text-[14px] text-ink-2 hover:text-ink',
                )}
                activeClassName="border-accent font-medium text-ink"
              >
                {doc.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const HelpNav = () => {
  const { i18n } = useTranslation('help');
  const locale = i18n.language;
  return (
    <nav aria-label="Help topics" className="py-2">
      {HELP_CATEGORIES.map((category) => (
        <CategorySection key={category.id} category={category} locale={locale} />
      ))}
    </nav>
  );
};
