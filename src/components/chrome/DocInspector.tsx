import { useTranslation } from 'react-i18next';
import { ChevronRight } from '@/components/libs/icons';
import { useUI, type InspectorSection } from '@/store/ui';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { ComingSoonBadge } from '@/components/settings/ComingSoonBadge';
import { IconButton } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const TABS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

interface DocInspectorProps {
  docName: string;
}

export const DocInspector = ({ docName }: DocInspectorProps) => {
  const { t } = useTranslation('chrome');
  const setInspectorMode = useUI((s) => s.setInspectorMode);
  const section = useUI((s) => s.inspectorSection);
  const setSection = useUI((s) => s.setInspectorSection);

  return (
    <aside
      data-testid="doc-inspector"
      className="relative hidden w-72 shrink-0 flex-col border-l border-rule bg-paper-2 md:flex"
    >
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <span
          data-testid="doc-inspector-name"
          className="flex-1 truncate font-mono text-[9px] uppercase tracking-wider text-ink-3"
        >
          {docName || '—'}
        </span>
        <ComingSoonBadge />
        <IconButton
          data-testid="doc-inspector-collapse"
          icon={ChevronRight}
          label={t('inspector.collapse')}
          onClick={() => setInspectorMode('icons')}
          className="h-5 w-5"
        />
      </div>

      <div className="flex border-b border-rule">
        {TABS.map((id) => {
          const on = section === id;
          // @lint-ignore native-button: tab strip; needs a LinkedTabStrip primitive (tracked for PR 5)
          return (
            <button
              key={id}
              data-testid={`doc-inspector-tab-${id}`}
              type="button"
              onClick={() => setSection(id)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex-1 border-b-2 px-1.5 py-2 text-center font-mono text-[9px] uppercase tracking-wider transition-colors',
                on
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
            >
              {t(`inspector.tabs.${id}`)}
            </button>
          );
        })}
      </div>

      <ComingSoon
        hint={t('inspector.expand')}
        side="left"
        className="block flex-1 self-stretch"
      >
        <div
          data-testid={`doc-inspector-pane-${section}`}
          className="flex-1 overflow-auto"
        >
          {section === 'outline' && <OutlinePane />}
          {section === 'info' && <InfoPane />}
          {section === 'history' && <HistoryPane />}
          {section === 'actions' && <ActionsPane />}
        </div>
      </ComingSoon>
    </aside>
  );
};

const OutlinePane = () => {
  const { t } = useTranslation('chrome');
  const rows: [string, string, boolean][] = [
    ['H1', "The bell-keeper's last morning", true],
    ['H2', 'Mira walks', false],
    ['H2', 'The tower', false],
    ['H2', 'Counting', false],
  ];
  return (
    <div className="px-4 py-3.5">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.outline.title')} ·{' '}
        {t('inspector.outline.sectionSummary', { count: rows.length })}
      </div>
      <div className="-ml-3.5">
        {rows.map(([level, text, active], i) => (
          <div
            key={i}
            className={cn(
              'flex items-baseline gap-2 border-l-2 py-1.5',
              level === 'H2' ? 'pl-7' : 'pl-3.5',
              active ? 'border-ink' : 'border-transparent',
            )}
          >
            <span className="w-5 font-mono text-[8px] uppercase tracking-wider text-ink-4">
              {level}
            </span>
            <span
              className={cn(
                'flex-1 font-serif text-[13px]',
                active ? 'font-medium text-ink' : 'text-ink-2',
              )}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoPane = () => {
  const { t } = useTranslation('chrome');
  const rows: [string, string][] = [
    [t('inspector.info.words'), '1,204 / 1,500'],
    [t('inspector.info.time'), '22:14 · today'],
    [t('inspector.info.created'), '14 days ago'],
    [t('inspector.info.section'), 'Manuscript'],
    [t('inspector.info.status'), 'Draft'],
  ];
  return (
    <div className="px-4 py-3.5">
      <div className="mb-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.info.title')}
      </div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="grid grid-cols-[80px_1fr] gap-2.5 border-b border-rule/60 py-1.5"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {k}
          </span>
          <span className="font-serif text-[13px] text-ink">{v}</span>
        </div>
      ))}
    </div>
  );
};

const HistoryPane = () => {
  const { t } = useTranslation('chrome');
  const rows: [string, string, boolean, boolean][] = [
    ['now', 'pre-edit · auto', true, false],
    ['12 min', 'auto', false, false],
    ['41 min', '"first draft"', false, true],
    ['Tue 09:14', '"before review"', false, true],
    ['Mon', 'auto', false, false],
  ];
  return (
    <div className="px-4 py-3.5">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.history.title')} · 12
      </div>
      {rows.map(([when, kind, current, pinned], i) => (
        <div
          key={i}
          className="flex items-center gap-2 border-b border-rule/60 py-2"
        >
          <span
            className={cn(
              'h-2 w-2 shrink-0 border border-ink',
              pinned ? 'bg-ink' : 'bg-transparent',
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'font-serif text-[12px] text-ink',
                current && 'font-medium',
              )}
            >
              {when}
            </div>
            <div className="font-serif text-[11px] italic text-ink-3">
              {kind}
            </div>
          </div>
          {current && (
            <span className="bg-ink px-1.5 py-px font-mono text-[8px] tracking-wider text-paper">
              {t('inspector.history.now')}
            </span>
          )}
        </div>
      ))}
      <div className="mt-3 inline-block border-b border-ink pb-px font-sans text-[11px] text-ink">
        {t('inspector.history.full')}
      </div>
    </div>
  );
};

const ActionsPane = () => {
  const { t } = useTranslation('chrome');
  const item = (text: string, kbd?: string, badge?: string) => (
    <div className="flex items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2 hover:bg-paper hover:text-ink">
      <span className="flex-1">{text}</span>
      {badge && (
        <span className="font-mono text-[9px] tracking-wider text-ink-3">
          {badge}
        </span>
      )}
      {kbd && <span className="font-mono text-[10px] text-ink-4">{kbd}</span>}
    </div>
  );
  return (
    <div className="py-2">
      <div className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.actions.label')}
      </div>
      {item(t('inspector.actions.rename'))}
      {item(t('inspector.actions.move'))}
      <div className="my-1.5 h-px bg-rule" />
      {item(t('inspector.actions.export'), t('inspector.actions.exportKbd'))}
      {item(t('inspector.actions.print'))}
      {item(t('inspector.actions.wordCount'))}
      <div className="my-1.5 h-px bg-rule" />
      {item(t('inspector.actions.versionHistory'), undefined, '12')}
      {item(t('inspector.actions.restore'))}
      <div className="my-1.5 h-px bg-rule" />
      {item(t('inspector.actions.trash'))}
    </div>
  );
};
