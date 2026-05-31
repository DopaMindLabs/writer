import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/components/ui/SearchField';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { searchHelp, type HelpSearchResult } from '@/lib/help/search';

interface HelpResultListProps {
  readonly results: readonly HelpSearchResult[];
  readonly onNavigate?: () => void;
}

/** Shared, presentational results list used by the landing page and palette. */
export const HelpResultList = ({ results, onNavigate }: HelpResultListProps) => {
  const { t } = useTranslation('help');
  return (
    <ul data-testid="help-results" className="divide-y divide-rule">
      {results.map((result) => (
        <li key={result.slug}>
          <Link
            to={routes.helpArticle(result.slug)}
            onClick={onNavigate}
            className="block py-3 hover:bg-paper-2"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium text-ink">
                {result.title}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-4">
                {t(`categories.${result.category}`)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">
              {result.excerpt}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export const HelpSearch = () => {
  const { t, i18n } = useTranslation('help');
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const results = trimmed.length > 0 ? searchHelp(trimmed, i18n.language) : [];

  return (
    <div>
      <SearchField
        data-testid="help-search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        onClear={() => {
          setQuery('');
        }}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
      />
      {trimmed.length > 0 ? (
        <div className="mt-4">
          {results.length > 0 ? (
            <>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-4">
                {t('resultsCount', { count: results.length })}
              </p>
              <HelpResultList results={results} />
            </>
          ) : (
            <p className="text-[14px] text-ink-3">
              {t('noResults', { query: trimmed })}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};
