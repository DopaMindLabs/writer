import { useTranslation } from 'react-i18next';
import { ChevronRight, Pin, RotateCcw } from '@/components/libs/icons';
import { useUI, type InspectorSection } from '@/store/ui';
import { useRevisions } from '@/hooks/useRevisions';
import { db } from '@/db/db';
import type { Revision } from '@/db/schema';
import { createRevision, restoreRevision } from '@/lib/revisions';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { ComingSoonBadge } from '@/components/settings/ComingSoonBadge';
import { IconButton } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import {
  formatRevisionAge,
  formatRevisionSubtitle,
} from './revisionDisplay';

const TABS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

interface DocInspectorProps {
  docName: string;
  docId: string;
}

interface DocInspectorTabsProps {
  section: InspectorSection;
  setSection: (id: InspectorSection) => void;
}

const DocInspectorTabs = ({ section, setSection }: DocInspectorTabsProps) => {
  const { t } = useTranslation('chrome');
  return (
    <div className="flex border-b border-rule">
      {TABS.map((id) => {
        const on = section === id;
        // @lint-ignore native-button: tab strip; needs a LinkedTabStrip primitive (tracked for PR 5)
        return (
          <button
            key={id}
            data-testid={`doc-inspector-tab-${id}`}
            type="button"
            onClick={() => { setSection(id); }}
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
  );
};

export const DocInspector = ({ docName, docId }: DocInspectorProps) => {
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
          onClick={() => { setInspectorMode('icons'); }}
          className="h-5 w-5"
        />
      </div>

      <DocInspectorTabs section={section} setSection={setSection} />

      <div
        data-testid={`doc-inspector-pane-${section}`}
        className="flex-1 overflow-auto"
      >
        {section === 'outline' && <OutlinePane />}
        {section === 'info' && <InfoPane />}
        {section === 'history' && <HistoryPane docId={docId} />}
        {section === 'actions' && <ActionsPane docId={docId} />}
      </div>
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
    <ComingSoon
      hint={t('inspector.expand')}
      side="left"
      className="block self-stretch"
    >
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
    </ComingSoon>
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
    <ComingSoon
      hint={t('inspector.expand')}
      side="left"
      className="block self-stretch"
    >
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
    </ComingSoon>
  );
};

interface RevisionRowProps {
  revision: Revision;
  isNewest: boolean;
}

const RevisionRow = ({ revision, isNewest }: RevisionRowProps) => {
  const { t } = useTranslation('chrome');
  const togglePin = (): void => {
    void db.revisions.update(revision.id, { pinned: !revision.pinned });
  };
  const restore = (): void => {
    void restoreRevision(revision.docId, revision.id).catch((err: unknown) => {
      console.error('Failed to restore revision', err);
    });
  };
  return (
    <div
      data-testid={`revision-row-${revision.id}`}
      className="group flex items-center gap-2 border-b border-rule/60 py-2"
    >
      <span
        className={cn(
          'h-2 w-2 shrink-0 border border-ink',
          revision.pinned ? 'bg-ink' : 'bg-transparent',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'font-serif text-[12px] text-ink',
            isNewest && 'font-medium',
          )}
        >
          {formatRevisionAge(revision.createdAt, t)}
        </div>
        <div className="truncate font-serif text-[11px] italic text-ink-3">
          {formatRevisionSubtitle(revision, t)}
        </div>
      </div>
      {isNewest && (
        <span className="bg-ink px-1.5 py-px font-mono text-[8px] tracking-wider text-paper">
          {t('inspector.history.now')}
        </span>
      )}
      <IconButton
        icon={Pin}
        label={t(revision.pinned ? 'inspector.history.unpin' : 'inspector.history.pin')}
        onClick={togglePin}
        className={cn('h-5 w-5', revision.pinned ? 'text-ink' : 'text-ink-4')}
      />
      <IconButton
        icon={RotateCcw}
        label={t('inspector.history.restore')}
        onClick={restore}
        className="h-5 w-5 text-ink-4"
      />
    </div>
  );
};

const HistoryPane = ({ docId }: { docId: string }) => {
  const { t } = useTranslation('chrome');
  const revisions = useRevisions(docId);
  const setVersionModalOpen = useUI((s) => s.setVersionModalOpen);

  return (
    <div className="px-4 py-3.5">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.history.title')} · {revisions.length}
      </div>
      {revisions.length === 0 ? (
        <p className="font-serif text-[12px] italic text-ink-3">
          {t('inspector.history.empty')}
        </p>
      ) : (
        revisions.map((rev, i) => (
          <RevisionRow key={rev.id} revision={rev} isNewest={i === 0} />
        ))
      )}
      <button
        type="button"
        data-testid="open-version-modal"
        onClick={() => { setVersionModalOpen(true); }}
        className="mt-3 inline-block border-b border-ink pb-px font-sans text-[11px] text-ink hover:text-ink-2"
      >
        {t('inspector.history.full')}
      </button>
    </div>
  );
};

const saveVersion = (docId: string, label: string | null): void => {
  if (label === null) return;
  void (async () => {
    const doc = await db.docs.get(docId);
    if (!doc) return;
    await createRevision(docId, doc.body, {
      kind: 'manual',
      label: label.trim() || undefined,
    });
  })().catch((err: unknown) => {
    console.error('Failed to save version', err);
  });
};

const ActionsPane = ({ docId }: { docId: string }) => {
  const { t } = useTranslation('chrome');
  const revisions = useRevisions(docId);
  const setVersionModalOpen = useUI((s) => s.setVersionModalOpen);

  const onSave = (): void => {
    saveVersion(docId, window.prompt(t('inspector.history.savePrompt')));
  };

  return (
    <div className="py-2">
      <div className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.actions.label')}
      </div>
      <ComingSoon hint={t('inspector.expand')} side="left" className="block">
        <ActionItem text={t('inspector.actions.rename')} />
        <ActionItem text={t('inspector.actions.move')} />
        <div className="my-1.5 h-px bg-rule" />
        <ActionItem
          text={t('inspector.actions.export')}
          kbd={t('inspector.actions.exportKbd')}
        />
        <ActionItem text={t('inspector.actions.print')} />
        <ActionItem text={t('inspector.actions.wordCount')} />
      </ComingSoon>
      <div className="my-1.5 h-px bg-rule" />
      <ActionButton
        text={t('inspector.actions.saveVersion')}
        onClick={onSave}
        testId="action-save-version"
      />
      <ActionButton
        text={t('inspector.actions.versionHistory')}
        badge={String(revisions.length)}
        onClick={() => { setVersionModalOpen(true); }}
        testId="action-version-history"
      />
      <div className="my-1.5 h-px bg-rule" />
      <ComingSoon hint={t('inspector.expand')} side="left" className="block">
        <ActionItem text={t('inspector.actions.trash')} />
      </ComingSoon>
    </div>
  );
};

interface ActionItemProps {
  text: string;
  kbd?: string;
  badge?: string;
}

const ActionItem = ({ text, kbd, badge }: ActionItemProps) => (
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

interface ActionButtonProps {
  text: string;
  badge?: string;
  onClick: () => void;
  testId: string;
}

const ActionButton = ({ text, badge, onClick, testId }: ActionButtonProps) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-[13px] text-ink-2 hover:bg-paper hover:text-ink"
  >
    <span className="flex-1">{text}</span>
    {badge && (
      <span className="font-mono text-[9px] tracking-wider text-ink-3">
        {badge}
      </span>
    )}
  </button>
);
