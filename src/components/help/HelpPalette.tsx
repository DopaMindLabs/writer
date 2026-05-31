import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from '@/components/libs/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchField } from '@/components/ui/SearchField';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';
import { useHelp } from '@/store/help';
import { searchHelp, type HelpSearchResult } from '@/lib/help/search';
import { HelpResultList } from './HelpSearch';

/** Static reference of the shortcuts that are actually wired in the app. */
const SHORTCUTS: readonly { readonly keys: string; readonly labelKey: string }[] = [
  { keys: '⌘K', labelKey: 'shortcuts.help' },
  { keys: '⌘\\', labelKey: 'shortcuts.focus' },
];

const ShortcutsList = () => {
  const { t } = useTranslation('help');
  return (
    <div className="py-2">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-4">
        {t('palette.shortcutsHeading')}
      </div>
      <ul className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <li
            key={s.keys}
            className="flex items-center justify-between text-[14px] text-ink-2"
          >
            <span>{t(s.labelKey)}</span>
            <kbd className="rounded-sm border border-rule bg-paper-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface PaletteBodyProps {
  readonly query: string;
  readonly results: readonly HelpSearchResult[];
  readonly onNavigate: () => void;
}

const PaletteBody = ({ query, results, onNavigate }: PaletteBodyProps) => {
  const { t } = useTranslation('help');
  if (query.length === 0) return <ShortcutsList />;
  if (results.length === 0) {
    return (
      <p className="py-4 text-[14px] text-ink-3">{t('noResults', { query })}</p>
    );
  }
  return <HelpResultList results={results} onNavigate={onNavigate} />;
};

export const HelpPalette = () => {
  const { t, i18n } = useTranslation('help');
  const helpOpen = useHelp((s) => s.open);
  const setHelpOpen = useHelp((s) => s.setOpen);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const results = trimmed.length > 0 ? searchHelp(trimmed, i18n.language) : [];

  const handleOpenChange = (open: boolean) => {
    setHelpOpen(open);
    if (!open) setQuery('');
  };
  const close = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={helpOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="help-palette"
        className="top-[12%] max-w-xl translate-y-0 gap-0 p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('palette.title')}</DialogTitle>
          <DialogDescription>{t('palette.description')}</DialogDescription>
        </DialogHeader>

        <div className="border-b border-rule px-4 py-3">
          <SearchField
            data-testid="help-palette-search"
            autoFocus
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
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 py-2">
          <PaletteBody query={trimmed} results={results} onNavigate={close} />
        </div>

        <div className="flex items-center justify-between border-t border-rule px-4 py-2.5">
          <Link
            to={routes.help()}
            onClick={close}
            className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink"
          >
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            {t('openCenter')}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
            {t('palette.hint')}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
