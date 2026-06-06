import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Pin, RotateCcw } from '@/components/libs/icons';
import { useUI, type InspectorSection } from '@/store/ui';
import { useRevisions } from '@/hooks/useRevisions';
import { useDocument, useSections } from '@/hooks/useDocuments';
import {
  useEffectiveInspectorConfig,
  useGlobalInspectorConfig,
} from '@/hooks/useDocInspectorConfig';
import type { UpdateSpec } from 'dexie';
import { db } from '@/db/db';
import type { Doc, Revision } from '@/db/schema';
import {
  countCharacters,
  countWords,
  lexicalJsonToPlainText,
  restoreRevision,
} from '@/lib/revisions';
import { enabledStages } from '@/lib/docInspector/config';
import { resolveStatus } from '@/lib/docInspector/status';
import type { InspectorToggleKey } from '@/lib/docInspector/features';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { IconButton } from '@/components/ui/icon';
import { Select } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { DateField } from '@/components/ui/DateField';
import { cn } from '@/lib/utils';
import {
  formatRevisionAge,
  formatRevisionSubtitle,
} from './revisionDisplay';

const TABS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

interface DocInspectorProps {
  docName: string;
  docId: string;
  hideHistory?: boolean;
  /** Render the info controls as read-only values (the Read surface). */
  readOnly?: boolean;
}

interface DocInspectorTabsProps {
  tabs: InspectorSection[];
  section: InspectorSection;
  setSection: (id: InspectorSection) => void;
}

const DocInspectorTabs = ({
  tabs,
  section,
  setSection,
}: DocInspectorTabsProps) => {
  const { t } = useTranslation('chrome');
  return (
    <div className="flex border-b border-rule">
      {tabs.map((id) => {
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

export const DocInspector = ({
  docName,
  docId,
  hideHistory = false,
  readOnly = false,
}: DocInspectorProps) => {
  const { t } = useTranslation('chrome');
  const setInspectorMode = useUI((s) => s.setInspectorMode);
  const section = useUI((s) => s.inspectorSection);
  const setSection = useUI((s) => s.setInspectorSection);

  const tabs = hideHistory ? TABS.filter((id) => id !== 'history') : TABS;
  // Don't mutate the persisted section: coerce locally so returning to the
  // write surface restores the History tab the user last had open.
  const activeSection =
    hideHistory && section === 'history' ? 'outline' : section;

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
        <IconButton
          data-testid="doc-inspector-collapse"
          icon={ChevronRight}
          label={t('inspector.collapse')}
          onClick={() => { setInspectorMode('icons'); }}
          className="h-5 w-5"
        />
      </div>

      <DocInspectorTabs
        tabs={tabs}
        section={activeSection}
        setSection={setSection}
      />

      <div
        data-testid={`doc-inspector-pane-${activeSection}`}
        className="flex-1 overflow-auto"
      >
        {activeSection === 'outline' && <OutlinePane />}
        {activeSection === 'info' && (
          <InfoPane docId={docId} readOnly={readOnly} />
        )}
        {activeSection === 'history' && <HistoryPane docId={docId} />}
        {activeSection === 'actions' && <ActionsPane />}
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

const writeMeta = (doc: Doc, patch: Partial<Doc['meta']>): void => {
  // Update each field by key-path instead of replacing the whole `meta` object,
  // so a concurrent autosave (which maintains `meta.wordCount`) and these
  // Inspector edits never clobber each other's fields through a stale read.
  const changes: UpdateSpec<Doc> = { updatedAt: Date.now() };
  for (const [key, value] of Object.entries(patch)) {
    (changes as Record<string, unknown>)[`meta.${key}`] = value;
  }
  void db.docs.update(doc.id, changes);
};

const parseLimit = (raw: string): number | undefined => {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const isOver = (count: number, limit: number | undefined): boolean =>
  limit !== undefined && limit > 0 && count > limit;

const formatCount = (count: number, limit: number | undefined): string =>
  limit !== undefined && limit > 0
    ? `${count.toLocaleString()} / ${limit.toLocaleString()}`
    : count.toLocaleString();

const InfoLabel = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
    {children}
  </span>
);

const MetaRow = ({
  label,
  value,
  warning = false,
  testId,
}: {
  label: string;
  value: ReactNode;
  warning?: boolean;
  testId?: string;
}) => (
  <div
    data-testid={testId}
    className="grid grid-cols-[88px_1fr] items-center gap-2.5 border-b border-rule/60 py-1.5"
  >
    <InfoLabel>{label}</InfoLabel>
    <span
      className={cn('font-serif text-[13px]', warning ? 'text-warning' : 'text-ink')}
    >
      {value}
    </span>
  </div>
);

const ControlRow = ({
  label,
  testId,
  children,
}: {
  label: string;
  testId?: string;
  children: ReactNode;
}) => (
  <div
    data-testid={testId}
    className="grid grid-cols-[88px_1fr] items-center gap-2.5 border-b border-rule/60 py-1.5"
  >
    <InfoLabel>{label}</InfoLabel>
    <div>{children}</div>
  </div>
);

const StatusControl = ({ doc, readOnly }: { doc: Doc; readOnly: boolean }) => {
  const { t } = useTranslation('chrome');
  const global = useGlobalInspectorConfig();
  const status = resolveStatus(doc.meta.status);
  const label = t('inspector.info.status');
  if (readOnly) {
    return (
      <MetaRow
        testId="inspector-row-status"
        label={label}
        value={t(`inspector.status.${status}`)}
      />
    );
  }
  const stages = enabledStages(global);
  const ids = stages.includes(status) ? stages : [status, ...stages];
  return (
    <ControlRow testId="inspector-row-status" label={label}>
      <Select
        data-testid="inspector-status"
        aria-label={label}
        value={status}
        onChange={(e) => {
          writeMeta(doc, { status: e.target.value });
        }}
        options={ids.map((id) => ({
          value: id,
          label: t(`inspector.status.${id}`),
        }))}
      />
    </ControlRow>
  );
};

const LimitControl = ({
  doc,
  field,
  label,
  readOnly,
}: {
  doc: Doc;
  field: 'wordLimit' | 'charLimit';
  label: string;
  readOnly: boolean;
}) => {
  const { t } = useTranslation('chrome');
  const value = doc.meta[field];
  if (readOnly) {
    return (
      <MetaRow
        testId={`inspector-row-${field}`}
        label={label}
        value={value ? value.toLocaleString() : t('inspector.info.noLimit')}
      />
    );
  }
  return (
    <ControlRow testId={`inspector-row-${field}`} label={label}>
      <TextField
        data-testid={`inspector-${field}`}
        aria-label={label}
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => {
          const parsed = parseLimit(e.target.value);
          writeMeta(
            doc,
            field === 'wordLimit' ? { wordLimit: parsed } : { charLimit: parsed },
          );
        }}
        className="w-24"
      />
    </ControlRow>
  );
};

const DueDateControl = ({ doc, readOnly }: { doc: Doc; readOnly: boolean }) => {
  const { t } = useTranslation('chrome');
  const due = doc.meta.dueDate;
  const overdue = due !== undefined && due < Date.now();
  const label = t('inspector.info.dueDate');
  if (readOnly) {
    return (
      <MetaRow
        testId="inspector-row-dueDate"
        label={label}
        warning={overdue}
        value={
          due !== undefined
            ? new Date(due).toLocaleDateString()
            : t('inspector.info.noDueDate')
        }
      />
    );
  }
  return (
    <ControlRow testId="inspector-row-dueDate" label={label}>
      <DateField
        data-testid="inspector-due-date"
        aria-label={label}
        value={due}
        error={overdue}
        onChange={(v) => {
          writeMeta(doc, { dueDate: v });
        }}
      />
    </ControlRow>
  );
};

const InfoFields = ({
  doc,
  eff,
  readOnly,
}: {
  doc: Doc;
  eff: Record<InspectorToggleKey, boolean>;
  readOnly: boolean;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <>
      {eff.status && <StatusControl doc={doc} readOnly={readOnly} />}
      {eff.wordLimit && (
        <LimitControl
          doc={doc}
          field="wordLimit"
          label={t('inspector.info.wordLimit')}
          readOnly={readOnly}
        />
      )}
      {eff.charLimit && (
        <LimitControl
          doc={doc}
          field="charLimit"
          label={t('inspector.info.charLimit')}
          readOnly={readOnly}
        />
      )}
      {eff.dueDate && <DueDateControl doc={doc} readOnly={readOnly} />}
    </>
  );
};

const InfoPane = ({ docId, readOnly }: { docId: string; readOnly: boolean }) => {
  const { t } = useTranslation('chrome');
  const doc = useDocument(docId);
  const sections = useSections(doc?.spaceId);
  const inspector = useEffectiveInspectorConfig(doc?.spaceId);
  const body = doc?.body;
  const text = useMemo(
    () => (body ? lexicalJsonToPlainText(body) : ''),
    [body],
  );

  const words = useMemo(() => countWords(text), [text]);
  const chars = useMemo(() => countCharacters(text), [text]);

  if (!doc) {
    return <div data-testid="doc-inspector-info" className="px-4 py-3.5" />;
  }

  const { wordLimit, charLimit } = doc.meta;
  const sectionName =
    sections?.find((s) => s.id === doc.sectionId)?.label ?? '—';
  const eff = inspector.effective;

  // Counts are always informational and shown for every document. The "/ limit"
  // suffix and the editable limit/input row appear only while the feature is
  // enabled; turning it off hides them (the stored value is kept, not deleted).
  const displayWordLimit = eff.wordLimit ? wordLimit : undefined;
  const displayCharLimit = eff.charLimit ? charLimit : undefined;

  return (
    <div data-testid="doc-inspector-info" className="px-4 py-3.5">
      <div className="mb-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('inspector.info.title')}
      </div>
      <MetaRow
        testId="inspector-row-words"
        label={t('inspector.info.words')}
        value={formatCount(words, displayWordLimit)}
        warning={isOver(words, displayWordLimit)}
      />
      <MetaRow
        testId="inspector-row-characters"
        label={t('inspector.info.characters')}
        value={formatCount(chars, displayCharLimit)}
        warning={isOver(chars, displayCharLimit)}
      />
      <MetaRow
        testId="inspector-row-updated"
        label={t('inspector.info.updated')}
        value={formatRevisionAge(doc.updatedAt, t)}
      />
      <MetaRow
        testId="inspector-row-section"
        label={t('inspector.info.section')}
        value={sectionName}
      />
      <InfoFields doc={doc} eff={eff} readOnly={readOnly} />
    </div>
  );
};

const HistoryPane = ({ docId }: { docId: string }) => {
  const { t } = useTranslation('chrome');
  const revisions = useRevisions(docId);
  const setVersionModalOpen = useUI((s) => s.setVersionModalOpen);
  const setSaveVersionOpen = useUI((s) => s.setSaveVersionOpen);

  return (
    <div className="px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Eyebrow size={9} tone="ink4">
          {t('inspector.history.title')} · {revisions.length}
        </Eyebrow>
        <Button
          kind="ghost"
          size="sm"
          data-testid="history-save-version"
          onClick={() => { setSaveVersionOpen(true); }}
        >
          {t('inspector.history.saveVersion')}
        </Button>
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
      <Button
        kind="ghost"
        size="sm"
        data-testid="open-version-modal"
        onClick={() => { setVersionModalOpen(true); }}
        className="mt-3"
      >
        {t('inspector.history.full')}
      </Button>
    </div>
  );
};

const ActionsPane = () => {
  const { t } = useTranslation('chrome');

  return (
    <div className="py-2">
      <Eyebrow size={9} tone="ink4" className="px-4 pb-1 pt-2">
        {t('inspector.actions.label')}
      </Eyebrow>
      <ComingSoon overlay hint={t('inspector.expand')}>
        <ActionItem text={t('inspector.actions.rename')} />
        <ActionItem text={t('inspector.actions.move')} />
        <div className="my-1.5 h-px bg-rule" />
        <ActionItem
          text={t('inspector.actions.export')}
          kbd={t('inspector.actions.exportKbd')}
        />
        <ActionItem text={t('inspector.actions.print')} />
        <ActionItem text={t('inspector.actions.wordCount')} />
        <div className="my-1.5 h-px bg-rule" />
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
      <Eyebrow asChild size={9} tone="ink3">
        <span>{badge}</span>
      </Eyebrow>
    )}
    {kbd && <span className="font-mono text-[10px] text-ink-4">{kbd}</span>}
  </div>
);

const RevisionRowActions = ({ revision }: { revision: Revision }) => {
  const { t } = useTranslation('chrome');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const togglePin = (): void => {
    void db.revisions.update(revision.id, { pinned: !revision.pinned });
  };
  const restore = (): void => {
    void restoreRevision(revision.docId, revision.id).catch((err: unknown) => {
      console.error('Failed to restore revision', err);
    });
  };
  return (
    <>
      <IconButton
        icon={Pin}
        label={t(revision.pinned ? 'inspector.history.unpin' : 'inspector.history.pin')}
        onClick={togglePin}
        className={cn('h-5 w-5', revision.pinned ? 'text-ink' : 'text-ink-4')}
      />
      <IconButton
        icon={RotateCcw}
        label={t('inspector.history.restore')}
        onClick={() => { setConfirmOpen(true); }}
        className="h-5 w-5 text-ink-4"
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('versionModal.restoreTitle')}
        description={t('versionModal.restoreConfirm')}
        confirmLabel={t('versionModal.restore')}
        cancelLabel={t('versionModal.cancel')}
        confirmKind="dangerous"
        onConfirm={restore}
      />
    </>
  );
};

const RevisionRow = ({
  revision,
  isNewest,
}: {
  revision: Revision;
  isNewest: boolean;
}) => {
  const { t } = useTranslation('chrome');
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
        <Eyebrow asChild size={9} tone="paper">
          <span className="bg-ink px-1.5 py-px">
            {t('inspector.history.now')}
          </span>
        </Eyebrow>
      )}
      <RevisionRowActions revision={revision} />
    </div>
  );
};
