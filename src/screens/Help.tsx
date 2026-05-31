import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageNav } from '@/components/chrome/PageNav';
import { Card } from '@/components/ui/card';
import { Link } from '@/components/ui/Link';
import {
  TypographyH1,
  TypographyLead,
} from '@/components/ui/typography';
import { invariant } from '@/lib/invariant';
import { routes } from '@/lib/routes';
import {
  getArticlesByCategory,
  HELP_CATEGORIES,
  type HelpCategory,
} from '@/lib/help/registry';
import { getHelpDoc } from '@/lib/help/content';
import { HelpNav } from '@/components/help/HelpNav';
import { HelpArticle } from '@/components/help/HelpArticle';
import { HelpSearch } from '@/components/help/HelpSearch';

interface CategoryCardProps {
  readonly category: HelpCategory;
  readonly locale: string;
}

const CategoryCard = ({ category, locale }: CategoryCardProps) => {
  const { t } = useTranslation('help');
  const articles = getArticlesByCategory(category.id);
  return (
    <Card className="p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t(`categories.${category.id}`)}
      </div>
      <ul className="mt-2 space-y-1">
        {articles.map((article) => {
          const doc = getHelpDoc(article.slug, locale);
          if (!doc) return null;
          return (
            <li key={article.slug}>
              <Link
                to={routes.helpArticle(article.slug)}
                className="text-[15px] text-ink-2 hover:text-ink"
              >
                {doc.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

const HelpLanding = ({ locale }: { readonly locale: string }) => {
  const { t } = useTranslation('help');
  return (
    <div data-testid="help-landing">
      <TypographyH1>{t('title')}</TypographyH1>
      <TypographyLead className="mt-3">{t('subtitle')}</TypographyLead>
      <div className="mt-8">
        <HelpSearch />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HELP_CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} locale={locale} />
        ))}
      </div>
    </div>
  );
};

export const HelpScreen = () => {
  const { i18n } = useTranslation('help');
  const locale = i18n.language;
  const { slug } = useParams();

  const renderMain = () => {
    if (slug === undefined) return <HelpLanding locale={locale} />;
    invariant(slug.length > 0, 'help article slug is empty');
    return <HelpArticle slug={slug} />;
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-paper text-ink">
      <PageNav />
      <div className="mx-auto flex w-full max-w-5xl gap-10 px-5 pt-10 pb-16 md:px-12 md:pt-12">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-4">
            <HelpNav />
          </div>
        </aside>
        <main className="min-w-0 max-w-2xl flex-1">{renderMain()}</main>
      </div>
    </div>
  );
};
