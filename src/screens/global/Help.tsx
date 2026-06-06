import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { NavShell } from '@/components/chrome/NavShell';
import type { NavTabDef, NavTabGroup } from '@/components/chrome/NavTabs';
import { Card } from '@/components/ui/card';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
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
import { HelpArticle } from '@/components/help/HelpArticle';
import { HelpSearch } from '@/components/help/HelpSearch';

/** Sentinel tab id for the landing overview (no article slug). */
const OVERVIEW_ID = 'overview';

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

const AllFeaturesLink = () => {
  const { t } = useTranslation('help');
  return (
    <Link
      to={routes.helpArticle('features')}
      data-testid="help-all-features"
      className="group mt-8 flex items-center justify-between gap-3 border border-rule bg-paper-2 px-4 py-3 hover:border-ink"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">
          {t('allFeatures.title')}
        </span>
        <span className="mt-0.5 block text-[13px] text-ink-3">
          {t('allFeatures.subtitle')}
        </span>
      </span>
      <span
        aria-hidden
        className="shrink-0 font-mono text-[12px] text-ink-3 group-hover:text-ink"
      >
        →
      </span>
    </Link>
  );
};

const HelpLanding = ({ locale }: { readonly locale: string }) => {
  const { t } = useTranslation('help');
  return (
    <div data-testid="help-landing">
      <TypographyH1>{t('title')}</TypographyH1>
      <TypographyLead className="mt-3">{t('subtitle')}</TypographyLead>
      <div className="mt-8 flex items-start gap-4">
        <div className="flex-1">
          <HelpSearch />
        </div>
        <LanguagePicker
          ariaLabel={t('languagePickerLabel')}
          className="w-40 shrink-0"
          data-testid="help-language-picker"
        />
      </div>
      <AllFeaturesLink />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HELP_CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} locale={locale} />
        ))}
      </div>
    </div>
  );
};

/**
 * Builds the left-rail sub-navigation that mirrors Settings: a leading
 * "Overview" entry, then one group per help category listing its articles.
 */
const useHelpNavGroups = (locale: string): NavTabGroup[] => {
  const { t } = useTranslation('help');
  const groups: NavTabGroup[] = [
    {
      label: t('navGroup'),
      tabs: [{ id: OVERVIEW_ID, label: t('navOverview') }],
    },
  ];
  for (const category of HELP_CATEGORIES) {
    const tabs = getArticlesByCategory(category.id).reduce<NavTabDef[]>(
      (acc, article) => {
        const doc = getHelpDoc(article.slug, locale);
        if (doc) acc.push({ id: article.slug, label: doc.title });
        return acc;
      },
      [],
    );
    if (tabs.length > 0) {
      groups.push({ label: t(`categories.${category.id}`), tabs });
    }
  }
  return groups;
};

export const HelpScreen = () => {
  const { t, i18n } = useTranslation('help');
  const locale = i18n.language;
  const { slug } = useParams();
  const navigate = useNavigate();
  const groups = useHelpNavGroups(locale);
  const active = slug ?? OVERVIEW_ID;

  const handleSelect = (id: string) => {
    void navigate(id === OVERVIEW_ID ? routes.help() : routes.helpArticle(id));
  };

  const renderMain = () => {
    if (slug === undefined) return <HelpLanding locale={locale} />;
    invariant(slug.length > 0, 'help article slug is empty');
    return <HelpArticle slug={slug} />;
  };

  const showMachineNotice = locale !== 'en';

  return (
    <NavShell
      variant="global"
      subtitle={t('shellSubtitle')}
      navLabel={t('navAria')}
      groups={groups}
      active={active}
      onSelect={handleSelect}
    >
      {showMachineNotice ? (
        <div
          role="note"
          data-testid="help-machine-translation-banner"
          className="mb-6 border border-rule bg-paper-2 p-3 text-[13px] text-ink-2"
        >
          <div className="mb-1 flex items-center justify-between gap-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {t('machineTranslationBanner.label')}
            </div>
            <LanguagePicker
              ariaLabel={t('languagePickerLabel')}
              className="w-40 shrink-0"
              data-testid="help-banner-language-picker"
            />
          </div>
          {t('machineTranslationBanner.body')}
        </div>
      ) : null}
      {renderMain()}
    </NavShell>
  );
};
