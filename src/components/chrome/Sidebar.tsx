import { useLocation, useNavigate } from 'react-router-dom';
import {
  forwardRef,
  useMemo,
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings } from '@/components/libs/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { TextField } from '@/components/ui/TextField';
import { SpaceMenuPopover } from './SpaceMenuPopover';
import { DocRowMenu } from './DocRowMenu';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { formatDocName } from '@/lib/doc-naming';
import { createDoc as createDocInRepo, renameDoc } from '@/lib/docs';
import { renameSection } from '@/lib/section-actions';
import { routes } from '@/lib/routes';
import {
  getTemplate,
  type TemplateSection as TemplateSectionDef,
} from '@/data/templates';
import type { Doc, Section, Space } from '@/db/schema';
import { cn } from '@/lib/utils';

interface SidebarProps {
  spaceId: string;
  activeDocId: string | null;
  className?: string;
}

interface AddingState {
  sectionId: string;
  value: string;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const formatSpaceAge = (createdAt: number, t: TranslateFn): string => {
  const now = Date.now();
  const diffMs = Math.max(0, now - createdAt);
  const day = 86400000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return t('chrome:sidebar.ageNew');
  if (days < 30) return t('chrome:sidebar.ageDays', { count: days });
  if (days < 365)
    return t('chrome:sidebar.ageMonths', { count: Math.floor(days / 30) });
  return t('chrome:sidebar.ageYears', { count: Math.floor(days / 365) });
};

const inferModeSuffix = (pathname: string): string => {
  if (pathname.endsWith('/read')) return '/read';
  if (pathname.endsWith('/split')) return '/split';
  return '';
};

interface SpaceHeaderProps {
  spaceId: string;
  space: Space | undefined;
}

const SpaceMenu = ({
  space,
  onRename,
}: {
  space: Space;
  onRename: () => void;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            data-tour="tour-sidebar-settings"
            data-testid="sidebar-space-menu-trigger"
            aria-label={t('chrome:sidebar.openSpaceMenu')}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-ink-3 opacity-0 transition-opacity hover:bg-paper hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink group-hover:opacity-100 data-[state=open]:bg-ink data-[state=open]:text-paper data-[state=open]:opacity-100"
          >
            <Settings className="h-3.5 w-3.5" />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t('chrome:sidebar.openSpaceMenu')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="p-0">
        <SpaceMenuPopover space={space} onRename={onRename} />
      </PopoverContent>
    </Popover>
  );
};

const SpaceSubtitle = ({ space }: { space: Space | undefined }) => {
  const { t } = useTranslation('chrome');
  const base = space?.shared
    ? t('chrome:sidebar.shared')
    : t('chrome:sidebar.private');
  const age = space ? formatSpaceAge(space.createdAt, t) : null;
  return (
    <div
      data-testid="sidebar-space-subtitle"
      className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3"
    >
      {age ? t('chrome:sidebar.subtitleWithAge', { base, age }) : base}
    </div>
  );
};

const SpaceHeader = ({ spaceId, space }: SpaceHeaderProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const [editingSpaceName, setEditingSpaceName] = useState(false);
  const [draftSpaceName, setDraftSpaceName] = useState(space?.name ?? '');

  useEffect(() => {
    if (!editingSpaceName) setDraftSpaceName(space?.name ?? '');
  }, [space?.name, editingSpaceName]);

  const commitSpaceName = async () => {
    setEditingSpaceName(false);
    const next = draftSpaceName.trim();
    if (!next || next === space?.name) return;
    await db.spaces.update(spaceId, { name: next, updatedAt: Date.now() });
  };

  return (
    <div className="group border-b border-rule px-5 pb-4 pt-5">
      {editingSpaceName ? (
        <TextField
          variant="bare"
          autoFocus
          value={draftSpaceName}
          onChange={(e) => { setDraftSpaceName(e.target.value); }}
          onBlur={() => { void commitSpaceName(); }}
          onFocus={(e) => { e.currentTarget.select(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraftSpaceName(space?.name ?? '');
              setEditingSpaceName(false);
            }
          }}
          aria-label={t('chrome:sidebar.renameSpace')}
          data-testid="sidebar-space-title-input"
          className="font-serif text-lg font-medium leading-tight tracking-tight"
        />
      ) : (
        <div className="flex items-center gap-2" data-tour="tour-sidebar-space-title">
          <button
            type="button"
            onClick={() => { if (space) setEditingSpaceName(true); }}
            disabled={!space}
            title={space ? t('chrome:sidebar.renameSpace') : undefined}
            data-testid="sidebar-space-title"
            className="block min-w-0 flex-1 cursor-text truncate text-left font-serif text-lg font-medium leading-tight tracking-tight text-ink"
          >
            {space?.name ?? '…'}
          </button>
          {space ? (
            <SpaceMenu
              space={space}
              onRename={() => { setEditingSpaceName(true); }}
            />
          ) : null}
        </div>
      )}
      <SpaceSubtitle space={space} />
    </div>
  );
};

interface AddController {
  adding: AddingState | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

interface SidebarSectionProps {
  sec: Section;
  docs: Doc[];
  spaceId: string;
  activeDocId: string | null;
  onBrainSpace: boolean;
  notesCount: number;
  docHref: (docId: string) => string;
  startAdd: (sectionId: string, parentLabel: string, subLabel: string | null) => void;
  add: AddController;
}

const MaybeAddInput = ({
  sectionId,
  indented,
  add,
}: {
  sectionId: string;
  indented?: boolean;
  add: AddController;
}) => {
  if (add.adding?.sectionId !== sectionId) return null;
  return (
    <AddDocInput
      ref={add.inputRef}
      sectionId={sectionId}
      value={add.adding.value}
      indented={indented}
      onChange={add.onChange}
      onKeyDown={add.onKeyDown}
      onBlur={add.onBlur}
    />
  );
};

const SectionEmpty = ({
  sectionId,
  indented = false,
}: {
  sectionId: string;
  indented?: boolean;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid={`sidebar-section-${sectionId}-empty`}
      className={
        indented
          ? 'px-5 pl-7 py-1 text-[11px] italic text-ink-4'
          : 'px-5 py-1.5 text-xs italic text-ink-4'
      }
    >
      {t('chrome:sidebar.empty')}
    </div>
  );
};

const SidebarSection = ({
  sec,
  docs,
  spaceId,
  activeDocId,
  onBrainSpace,
  notesCount,
  docHref,
  startAdd,
  add,
}: SidebarSectionProps) => {
  const isWorkshop = sec.label === 'Workshop';
  const showEmpty = docs.length === 0 && add.adding?.sectionId !== sec.id;
  return (
    <div data-testid={`sidebar-section-${sec.id}`} className="mb-2">
      <SectionHeader
        sectionId={sec.id}
        label={sec.label}
        onAdd={() => { startAdd(sec.id, sec.label, null); }}
      />
      {isWorkshop && (
        <BrainSpaceLink
          spaceId={spaceId}
          active={onBrainSpace}
          count={notesCount}
        />
      )}
      {docs.map((d) => (
        <DocLink
          key={d.id}
          doc={d}
          href={docHref(d.id)}
          active={d.id === activeDocId}
        />
      ))}
      <MaybeAddInput sectionId={sec.id} add={add} />
      {showEmpty && <SectionEmpty sectionId={sec.id} />}
    </div>
  );
};

/**
 * Flattens each top section's own documents together with those of its
 * subsections (in subsection order) into a single list, so the nav renders a
 * subsection's docs directly under its parent section with no header row.
 */
const buildDocsForSection = (
  topSections: Section[],
  subsectionsByParent: Map<string, Section[]>,
  docsBySection: Map<string, Doc[]>,
): Map<string, Doc[]> => {
  const map = new Map<string, Doc[]>();
  for (const top of topSections) {
    const combined = [...(docsBySection.get(top.id) ?? [])];
    for (const sub of subsectionsByParent.get(top.id) ?? []) {
      combined.push(...(docsBySection.get(sub.id) ?? []));
    }
    map.set(top.id, combined);
  }
  return map;
};

const useSidebarSections = (sections: Section[], docs: Doc[]) => {
  const { topSections, subsectionsByParent } = useMemo(() => {
    const top: Section[] = [];
    const subs = new Map<string, Section[]>();
    for (const s of sections) {
      if (s.parentSectionId === null) {
        top.push(s);
      } else {
        const arr = subs.get(s.parentSectionId) ?? [];
        arr.push(s);
        subs.set(s.parentSectionId, arr);
      }
    }
    top.sort((a, b) => a.order - b.order);
    for (const arr of subs.values()) arr.sort((a, b) => a.order - b.order);
    return { topSections: top, subsectionsByParent: subs };
  }, [sections]);

  const docsBySection = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of docs) {
      const arr = map.get(d.sectionId) ?? [];
      arr.push(d);
      map.set(d.sectionId, arr);
    }
    return map;
  }, [docs]);

  const docsForSection = useMemo(
    () => buildDocsForSection(topSections, subsectionsByParent, docsBySection),
    [topSections, subsectionsByParent, docsBySection],
  );

  return { topSections, docsForSection };
};

const resolveDefaultName = (
  topTemplateDefByLabel: Map<string, TemplateSectionDef>,
  parentLabel: string,
  subLabel: string | null,
  untitled: string,
): string => {
  const parentDef = topTemplateDefByLabel.get(parentLabel);
  if (!parentDef) return untitled;
  if (subLabel === null) {
    return parentDef.defaultDocName
      ? formatDocName(parentDef.defaultDocName)
      : untitled;
  }
  const subDef = (parentDef.sections ?? []).find((s) => s.label === subLabel);
  return subDef?.defaultDocName
    ? formatDocName(subDef.defaultDocName)
    : untitled;
};

const createDoc = async (
  spaceId: string,
  sectionId: string,
  name: string,
): Promise<string> => {
  const doc = await createDocInRepo({ spaceId, sectionId, name });
  return doc.id;
};

interface InlineRename {
  editing: boolean;
  draft: string;
  setDraft: (next: string) => void;
  beginEdit: () => void;
  commit: () => Promise<void>;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

const useInlineRename = (
  current: string,
  save: (next: string) => Promise<void>,
): InlineRename => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);

  useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === current) return;
    await save(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(current);
      setEditing(false);
    }
  };

  return {
    editing,
    draft,
    setDraft,
    beginEdit: () => { setEditing(true); },
    commit,
    onKeyDown,
  };
};

const createSection = async (
  spaceId: string,
  label: string,
  order: number,
): Promise<string> => {
  const id = newId();
  await db.sections.add({
    id,
    spaceId,
    parentSectionId: null,
    label,
    order,
  });
  return id;
};

interface AddSectionController {
  adding: boolean;
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onStart: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const useAddSection = (
  spaceId: string,
  sections: Section[],
): AddSectionController => {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  const commit = async () => {
    const label = value.trim();
    if (!label) {
      setAdding(false);
      setValue('');
      return;
    }
    const topOrders = sections
      .filter((s) => s.parentSectionId === null)
      .map((s) => s.order);
    const nextOrder = topOrders.length === 0 ? 0 : Math.max(...topOrders) + 1;
    await createSection(spaceId, label, nextOrder);
    setAdding(false);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(false);
      setValue('');
    }
  };

  return {
    adding,
    value,
    inputRef,
    onStart: () => { setAdding(true); },
    onChange: setValue,
    onKeyDown,
    onBlur: () => { void commit(); },
  };
};

const useFocusOnMount = (
  active: boolean,
  ref: RefObject<HTMLInputElement | null>,
): void => {
  useEffect(() => {
    if (active && ref.current) {
      const input = ref.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [active, ref]);
};

const useTopTemplateMap = (
  space: Space | undefined,
): Map<string, TemplateSectionDef> => {
  const templateDef = space ? getTemplate(space.template) : undefined;
  return useMemo(() => {
    const m = new Map<string, TemplateSectionDef>();
    for (const s of templateDef?.sections ?? []) m.set(s.label, s);
    return m;
  }, [templateDef]);
};

const useAddDoc = (spaceId: string, space: Space | undefined) => {
  const { t } = useTranslation(['chrome', 'common']);
  const navigate = useNavigate();
  const [adding, setAdding] = useState<AddingState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusOnMount(adding !== null, inputRef);
  const topTemplateDefByLabel = useTopTemplateMap(space);

  const startAdd = (
    sectionId: string,
    parentLabel: string,
    subLabel: string | null,
  ) => {
    const untitled = t('untitled', { ns: 'common' });
    const value = resolveDefaultName(
      topTemplateDefByLabel,
      parentLabel,
      subLabel,
      untitled,
    );
    setAdding({ sectionId, value });
  };

  const commitAdd = async () => {
    if (!adding) return;
    const name = adding.value.trim() || t('untitled', { ns: 'common' });
    const id = await createDoc(spaceId, adding.sectionId, name);
    setAdding(null);
    void navigate(routes.docWrite(spaceId, id));
  };

  const commitOnBlur = async () => {
    if (!adding) return;
    const trimmed = adding.value.trim();
    if (!trimmed) {
      setAdding(null);
      return;
    }
    await createDoc(spaceId, adding.sectionId, trimmed);
    setAdding(null);
  };

  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(null);
    }
  };

  const add: AddController = {
    adding,
    inputRef,
    onChange: (v) => { setAdding((prev) => (prev ? { ...prev, value: v } : prev)); },
    onKeyDown: onAddKey,
    onBlur: () => { void commitOnBlur(); },
  };

  return { add, startAdd };
};

interface SidebarNavProps {
  spaceId: string;
  activeDocId: string | null;
  sections: Section[];
  notesCount: number;
  onBrainSpace: boolean;
  modeSuffix: string;
  space: Space | undefined;
}

const SidebarNav = ({
  spaceId,
  activeDocId,
  sections,
  notesCount,
  onBrainSpace,
  modeSuffix,
  space,
}: SidebarNavProps) => {
  const { t } = useTranslation('chrome');
  const docs = useDocuments(spaceId) ?? [];
  const { topSections, docsForSection } = useSidebarSections(sections, docs);
  const { add, startAdd } = useAddDoc(spaceId, space);
  const addSection = useAddSection(spaceId, sections);
  const templateDef = space ? getTemplate(space.template) : undefined;
  const allowExtraSections = templateDef?.allowExtraSections === true;

  const docHref = (docId: string): string =>
    `${routes.docWrite(spaceId, docId)}${modeSuffix}`;

  return (
    <nav
      aria-label={t('sidebar.navLabel')}
      className="flex-1 overflow-auto py-2"
      data-tour="tour-sidebar-sections"
    >
      {topSections.map((sec) => (
        <SidebarSection
          key={sec.id}
          sec={sec}
          docs={docsForSection.get(sec.id) ?? []}
          spaceId={spaceId}
          activeDocId={activeDocId}
          onBrainSpace={onBrainSpace}
          notesCount={notesCount}
          docHref={docHref}
          startAdd={startAdd}
          add={add}
        />
      ))}
      {allowExtraSections && <AddSectionRow add={addSection} />}
      {!topSections.some((s) => s.label === 'Workshop') && (
        <WorkshopFallback
          spaceId={spaceId}
          onBrainSpace={onBrainSpace}
          notesCount={notesCount}
        />
      )}
    </nav>
  );
};

export const Sidebar = ({ spaceId, activeDocId, className }: SidebarProps) => {
  const { t } = useTranslation('chrome');
  const space = useSpace(spaceId);
  const sections = useSections(spaceId) ?? [];
  const notes = useNotes(spaceId);
  const location = useLocation();
  const modeSuffix = inferModeSuffix(location.pathname);
  const onBrainSpace = location.pathname.endsWith('/brain-space');

  return (
    <aside
      aria-label={t('sidebar.landmarkLabel')}
      className={cn(
        'flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2',
        className,
      )}
    >
      <SpaceHeader spaceId={spaceId} space={space} />
      <SidebarNav
        spaceId={spaceId}
        activeDocId={activeDocId}
        sections={sections}
        notesCount={notes.length}
        onBrainSpace={onBrainSpace}
        modeSuffix={modeSuffix}
        space={space}
      />
    </aside>
  );
};

const AddSectionRow = ({ add }: { add: AddSectionController }) => {
  const { t } = useTranslation('chrome');
  if (add.adding) {
    return (
      <div
        data-testid="sidebar-add-section-row"
        className="-ml-px flex items-center gap-2 border-l-2 border-ink px-5 py-1"
      >
        <TextField
          ref={add.inputRef}
          variant="bare"
          value={add.value}
          onChange={(e) => { add.onChange(e.target.value); }}
          onKeyDown={add.onKeyDown}
          onBlur={add.onBlur}
          placeholder={t('sidebar.sectionNamePlaceholder')}
          aria-label={t('sidebar.addSectionAria')}
          data-testid="sidebar-add-section-input"
          className="flex-1 text-[13px]"
        />
      </div>
    );
  }
  return (
    <div
      data-testid="sidebar-add-section-row"
      className="group mt-1 px-5 py-1"
    >
      <button
        type="button"
        onClick={add.onStart}
        data-testid="sidebar-add-section-trigger"
        aria-label={t('sidebar.addSectionAria')}
        className="flex w-full items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4 opacity-0 transition-opacity hover:text-ink focus-visible:text-ink focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
        <span>{t('sidebar.addSection')}</span>
      </button>
    </div>
  );
};

const WorkshopFallback = ({
  spaceId,
  onBrainSpace,
  notesCount,
}: {
  spaceId: string;
  onBrainSpace: boolean;
  notesCount: number;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <div
      data-testid="sidebar-workshop-fallback"
      className="mt-4 border-t border-rule pt-2"
    >
      <div
        data-testid="sidebar-workshop-fallback-label"
        className="px-5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4"
      >
        {t('sidebar.workshop')}
      </div>
      <BrainSpaceLink spaceId={spaceId} active={onBrainSpace} count={notesCount} />
    </div>
  );
};

const SectionHeader = ({
  sectionId,
  label,
  indented = false,
  onAdd,
}: {
  sectionId: string;
  label: string;
  indented?: boolean;
  onAdd: () => void;
}) => {
  const { t } = useTranslation('chrome');
  const rename = useInlineRename(label, (next) =>
    renameSection(sectionId, next),
  );
  return (
    <div
      data-testid={`sidebar-section-${sectionId}-header`}
      className={cn(
        'group flex items-center gap-1 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4',
        indented ? 'pl-7' : 'pl-5',
      )}
    >
      {rename.editing ? (
        <TextField
          variant="bare"
          autoFocus
          value={rename.draft}
          onChange={(e) => { rename.setDraft(e.target.value); }}
          onBlur={() => { void rename.commit(); }}
          onFocus={(e) => { e.currentTarget.select(); }}
          onKeyDown={rename.onKeyDown}
          aria-label={t('sidebar.renameSectionAria', { label })}
          data-testid={`sidebar-section-${sectionId}-rename-input`}
          className="flex-1 font-mono text-[9px] uppercase tracking-[0.08em]"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={rename.beginEdit}
          title={t('sidebar.renameSection')}
          data-testid={`sidebar-section-${sectionId}-label`}
          className="flex-1 cursor-text truncate text-left"
        >
          {label}
        </button>
      )}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t('sidebar.addDocAria', { label })}
        data-testid={`sidebar-section-${sectionId}-add`}
        className="rounded-sm text-ink-4 opacity-0 transition-opacity hover:text-ink focus:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
};

interface AddDocInputProps {
  sectionId: string;
  value: string;
  indented?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const AddDocInput = forwardRef<HTMLInputElement, AddDocInputProps>(
  ({ sectionId, value, indented = false, onChange, onKeyDown, onBlur }, ref) => {
    const { t } = useTranslation('chrome');
    return (
      <div
        className={cn(
          '-ml-px flex items-center gap-2 border-l-2 border-ink py-1',
          indented ? 'pl-7 pr-3' : 'px-5',
        )}
      >
        <TextField
          ref={ref}
          variant="bare"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={t('sidebar.docNamePlaceholder')}
          aria-label={t('sidebar.addDocInputAria')}
          data-testid={`sidebar-section-${sectionId}-add-input`}
          className="flex-1 text-[13px]"
        />
      </div>
    );
  },
);
AddDocInput.displayName = 'AddDocInput';

const BrainSpaceLink = ({
  spaceId,
  active,
  count,
}: {
  spaceId: string;
  active: boolean;
  count: number;
}) => {
  const { t } = useTranslation('common');
  return (
    <Link
      to={routes.brainSpace(spaceId)}
      data-testid="sidebar-brain-space-link"
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 px-5 py-1.5 transition-colors',
        active
          ? 'border-ink bg-paper font-medium text-ink'
          : 'border-transparent text-ink-2 hover:bg-paper',
      )}
    >
      <span
        data-testid="sidebar-brain-space-link-label"
        className="flex-1 text-[13px]"
      >
        {t('brainSpace')}
      </span>
      <span
        data-testid="sidebar-brain-space-link-count"
        className="font-mono text-[10px] text-ink-4"
      >
        {count > 0 ? `${String(count)}◦` : '◌'}
      </span>
    </Link>
  );
};

interface DocLinkBodyProps {
  doc: Doc;
  href: string;
  active: boolean;
  wordCount: number;
  rename: InlineRename;
}

const DocLinkBody = ({ doc, href, active, wordCount, rename }: DocLinkBodyProps) => {
  const { t } = useTranslation('chrome');
  if (rename.editing) {
    return (
      <TextField
        variant="bare"
        autoFocus
        value={rename.draft}
        onChange={(e) => { rename.setDraft(e.target.value); }}
        onBlur={() => { void rename.commit(); }}
        onFocus={(e) => { e.currentTarget.select(); }}
        onKeyDown={rename.onKeyDown}
        aria-label={t('sidebar.renameDocAria', { name: doc.name })}
        data-testid={`sidebar-doc-${doc.id}-rename-input`}
        className="flex-1 py-1.5 text-[13px]"
      />
    );
  }
  return (
    <Link
      to={href}
      onDoubleClick={rename.beginEdit}
      title={t('sidebar.renameDocHint')}
      data-testid={`sidebar-doc-${doc.id}`}
      className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
    >
      <span
        data-testid={`sidebar-doc-${doc.id}-name`}
        className={cn(
          'flex-1 truncate text-[13px]',
          active ? 'font-medium text-ink' : 'text-ink-2',
        )}
      >
        {doc.name}
      </span>
      <span
        data-testid={`sidebar-doc-${doc.id}-count`}
        className="inline-flex h-3 min-w-3 items-center justify-center font-mono text-[10px] text-ink-4"
      >
        {wordCount > 0 ? wordCount.toLocaleString() : '◌'}
      </span>
    </Link>
  );
};

const DocLink = ({
  doc,
  href,
  active,
  indented = false,
}: {
  doc: Doc;
  href: string;
  active: boolean;
  indented?: boolean;
}) => {
  const wordCount = doc.meta.wordCount;
  const rename = useInlineRename(doc.name, (next) => renameDoc(doc.id, next));
  return (
    <div
      className={cn(
        'group -ml-px flex items-center gap-2 border-l-2 transition-colors',
        indented ? 'pl-7' : 'pl-5',
        active
          ? 'border-ink bg-paper'
          : 'border-transparent hover:bg-paper',
      )}
    >
      <DocLinkBody
        doc={doc}
        href={href}
        active={active}
        wordCount={wordCount}
        rename={rename}
      />
      <DocRowMenu doc={doc} active={active} />
    </div>
  );
};

