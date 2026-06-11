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
import { MoreVertical, Plus, Settings } from '@/components/libs/icons';
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
import { IconButton } from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SpaceMenuPopover } from './SpaceMenuPopover';
import { RenameDocDialog } from './RenameDocDialog';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { formatDocName } from '@/lib/doc-naming';
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
  onClear: () => void;
}

interface SidebarSectionProps {
  sec: Section;
  subs: Section[];
  ownDocs: Doc[];
  spaceId: string;
  activeDocId: string | null;
  onBrainSpace: boolean;
  notesCount: number;
  docsBySection: Map<string, Doc[]>;
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
      onBlur={add.onClear}
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

interface SidebarSubsectionProps {
  sub: Section;
  parentLabel: string;
  subDocs: Doc[];
  activeDocId: string | null;
  docHref: (docId: string) => string;
  startAdd: (sectionId: string, parentLabel: string, subLabel: string | null) => void;
  add: AddController;
}

const SidebarSubsection = ({
  sub,
  parentLabel,
  subDocs,
  activeDocId,
  docHref,
  startAdd,
  add,
}: SidebarSubsectionProps) => {
  return (
    <div data-testid={`sidebar-section-${sub.id}`} className="mt-1">
      <SectionHeader
        sectionId={sub.id}
        label={`↳ ${sub.label}`}
        indented
        onAdd={() => { startAdd(sub.id, parentLabel, sub.label); }}
      />
      {subDocs.length === 0 && add.adding?.sectionId !== sub.id && (
        <SectionEmpty sectionId={sub.id} indented />
      )}
      {subDocs.map((d) => (
        <DocLink
          key={d.id}
          doc={d}
          href={docHref(d.id)}
          active={d.id === activeDocId}
          indented
        />
      ))}
      <MaybeAddInput sectionId={sub.id} indented add={add} />
    </div>
  );
};

const SidebarSection = ({
  sec,
  subs,
  ownDocs,
  spaceId,
  activeDocId,
  onBrainSpace,
  notesCount,
  docsBySection,
  docHref,
  startAdd,
  add,
}: SidebarSectionProps) => {
  const isWorkshop = sec.label === 'Workshop';
  const showEmpty =
    ownDocs.length === 0 &&
    subs.length === 0 &&
    add.adding?.sectionId !== sec.id;
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
      {ownDocs.map((d) => (
        <DocLink
          key={d.id}
          doc={d}
          href={docHref(d.id)}
          active={d.id === activeDocId}
        />
      ))}
      <MaybeAddInput sectionId={sec.id} add={add} />
      {subs.map((sub) => (
        <SidebarSubsection
          key={sub.id}
          sub={sub}
          parentLabel={sec.label}
          subDocs={docsBySection.get(sub.id) ?? []}
          activeDocId={activeDocId}
          docHref={docHref}
          startAdd={startAdd}
          add={add}
        />
      ))}
      {showEmpty && <SectionEmpty sectionId={sec.id} />}
    </div>
  );
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

  return { topSections, subsectionsByParent, docsBySection };
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
  const id = newId();
  await db.docs.add({
    id,
    spaceId,
    sectionId,
    name,
    body: '',
    meta: { wordCount: 0 },
    updatedAt: Date.now(),
  });
  return id;
};

const useAddDoc = (spaceId: string, space: Space | undefined) => {
  const { t } = useTranslation(['chrome', 'common']);
  const navigate = useNavigate();
  const [adding, setAdding] = useState<AddingState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [adding]);

  const templateDef = space ? getTemplate(space.template) : undefined;
  const topTemplateDefByLabel = useMemo(() => {
    const m = new Map<string, TemplateSectionDef>();
    for (const s of templateDef?.sections ?? []) m.set(s.label, s);
    return m;
  }, [templateDef]);

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
    onClear: () => { setAdding(null); },
  };

  return { add, startAdd };
};

export const Sidebar = ({ spaceId, activeDocId }: SidebarProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const space = useSpace(spaceId);
  const sections = useSections(spaceId) ?? [];
  const docs = useDocuments(spaceId) ?? [];
  const notes = useNotes(spaceId);
  const location = useLocation();
  const modeSuffix = inferModeSuffix(location.pathname);
  const onBrainSpace = location.pathname.endsWith('/dump');

  const { topSections, subsectionsByParent, docsBySection } =
    useSidebarSections(sections, docs);
  const { add, startAdd } = useAddDoc(spaceId, space);

  const docHref = (docId: string): string => {
    return `${routes.docWrite(spaceId, docId)}${modeSuffix}`;
  };

  return (
    <aside
      aria-label={t('chrome:sidebar.landmarkLabel')}
      className="flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2"
    >
      <SpaceHeader spaceId={spaceId} space={space} />
      <nav
        aria-label={t('chrome:sidebar.navLabel')}
        className="flex-1 overflow-auto py-2"
        data-tour="tour-sidebar-sections"
      >
        {topSections.map((sec) => (
          <SidebarSection
            key={sec.id}
            sec={sec}
            subs={subsectionsByParent.get(sec.id) ?? []}
            ownDocs={docsBySection.get(sec.id) ?? []}
            spaceId={spaceId}
            activeDocId={activeDocId}
            onBrainSpace={onBrainSpace}
            notesCount={notes.length}
            docsBySection={docsBySection}
            docHref={docHref}
            startAdd={startAdd}
            add={add}
          />
        ))}
        {!topSections.some((s) => s.label === 'Workshop') && (
          <WorkshopFallback
            spaceId={spaceId}
            onBrainSpace={onBrainSpace}
            notesCount={notes.length}
          />
        )}
      </nav>
    </aside>
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
  return (
    <div
      data-testid={`sidebar-section-${sectionId}-header`}
      className={cn(
        'group flex items-center gap-1 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4',
        indented ? 'pl-7 pr-3' : 'px-5',
      )}
    >
      <span
        data-testid={`sidebar-section-${sectionId}-label`}
        className="flex-1 truncate"
      >
        {label}
      </span>
      <IconButton
        icon={Plus}
        label={t('sidebar.addDocAria', { label })}
        onClick={onAdd}
        iconSize="xs"
        data-testid={`sidebar-section-${sectionId}-add`}
        className="h-4 w-4 rounded-sm opacity-0 hover:bg-paper hover:text-ink group-hover:opacity-100 focus:opacity-100"
      />
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

const DocRowMenu = ({ doc }: { doc: Doc }) => {
  const { t } = useTranslation('chrome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton
            data-testid={`sidebar-doc-${doc.id}-menu`}
            icon={MoreVertical}
            label={t('sidebar.docMenuAria', { name: doc.name })}
            className="md:hidden"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid={`sidebar-doc-${doc.id}-rename`}
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setRenameOpen(true);
            }}
          >
            {t('sidebar.renameDoc')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDocDialog
        docId={doc.id}
        docName={doc.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
    </>
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
  return (
    <div
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 transition-colors',
        indented ? 'pl-7 pr-5' : 'px-5',
        active
          ? 'border-ink bg-paper'
          : 'border-transparent hover:bg-paper',
      )}
    >
      <Link
        to={href}
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
          className="font-mono text-[10px] text-ink-4"
        >
          {wordCount > 0 ? wordCount.toLocaleString() : '◌'}
        </span>
      </Link>
      <DocRowMenu doc={doc} />
    </div>
  );
};

