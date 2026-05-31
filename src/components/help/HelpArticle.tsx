import { useTranslation } from 'react-i18next';
import { TypographyH1, TypographyP } from '@/components/ui/typography';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { getArticleMeta } from '@/lib/help/registry';
import { getHelpDoc, type HelpDoc, type HelpHeading } from '@/lib/help/content';
import { Markdown } from './Markdown';

interface OnThisPageProps {
  readonly slug: string;
  readonly headings: readonly HelpHeading[];
}

const OnThisPage = ({ slug, headings }: OnThisPageProps) => {
  const { t } = useTranslation('help');
  if (headings.length < 3) return null;
  return (
    <aside className="mb-8 border-l-2 border-rule pl-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('onThisPage')}
      </div>
      <ul className="mt-2 space-y-1">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? 'pl-3' : undefined}>
            <Link
              to={routes.helpArticle(slug, h.id)}
              className="text-[13px] text-ink-3 hover:text-ink"
            >
              {h.text}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

interface RelatedProps {
  readonly related: readonly string[];
  readonly locale: string;
}

const Related = ({ related, locale }: RelatedProps) => {
  const { t } = useTranslation('help');
  const items = related
    .map((slug) => ({ slug, doc: getHelpDoc(slug, locale) }))
    .filter((item): item is { slug: string; doc: HelpDoc } =>
      item.doc !== undefined,
    );
  if (items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-rule pt-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('related')}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map(({ slug, doc }) => (
          <li key={slug}>
            <Link
              to={routes.helpArticle(slug)}
              className="text-[15px] text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export interface HelpArticleProps {
  readonly slug: string;
}

export const HelpArticle = ({ slug }: HelpArticleProps) => {
  const { t, i18n } = useTranslation('help');
  const locale = i18n.language;
  const doc = getHelpDoc(slug, locale);
  const meta = getArticleMeta(slug);

  if (!doc) {
    return (
      <div data-testid="help-article-missing">
        <TypographyP variant="empty">{t('articleNotFound')}</TypographyP>
        <Link
          to={routes.help()}
          className="mt-4 inline-block text-ink-3 underline underline-offset-4 hover:text-ink"
        >
          {t('backToHelp')}
        </Link>
      </div>
    );
  }

  return (
    <article data-testid="help-article">
      <TypographyH1>{doc.title}</TypographyH1>
      <div className="mt-8">
        <OnThisPage slug={slug} headings={doc.headings} />
        <Markdown>{doc.body}</Markdown>
      </div>
      {meta?.related ? <Related related={meta.related} locale={locale} /> : null}
    </article>
  );
};
