import { useLocation, useNavigate } from 'react-router-dom';
import {
  forwardRef,
  useMemo,
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
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
import { IconButton } from '@/components/ui/icon';
import { SpaceMenuPopover } from './SpaceMenuPopover';
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
import type { Doc, Section } from '@/db/schema';
import { cn } from '@/lib/utils';

interface SidebarProps {
  spaceId: string;
  activeDocId: string | null;
}

interface AddingState {
  sectionId: string;
  value: string;
}

export const Sidebar = ({ spaceId, activeDocId }: SidebarProps) => {
  const { t } = useTranslation(['chrome', 'common']);
  const space = useSpace(spaceId);
  const sections = useSections(spaceId);
  const docs = useDocuments(spaceId);
  const notes = useNotes(spaceId);
  const location = useLocation();
  const navigate = useNavigate();
  const modeSuffix = inferModeSuffix(location.pathname);
  const onBrainSpace = location.pathname.endsWith('/dump');

  const [adding, setAdding] = useState<AddingState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingSpaceName, setEditingSpaceName] = useState(false);
  const [draftSpaceName, setDraftSpaceName] = useState(space?.name ?? '');

  useEffect(() => {
    if (adding && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [adding]);

  useEffect(() => {
    if (!editingSpaceName) setDraftSpaceName(space?.name ?? '');
  }, [space?.name, editingSpaceName]);

  const commitSpaceName = async () => {
    setEditingSpaceName(false);
    const next = draftSpaceName.trim();
    if (!next || next === space?.name) return;
    await db.spaces.update(spaceId, { name: next, updatedAt: Date.now() });
  };

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

  const templateDef = space ? getTemplate(space.template) : undefined;
  const topTemplateDefByLabel = useMemo(() => {
    const m = new Map<string, TemplateSectionDef>();
    for (const s of templateDef?.sections ?? []) m.set(s.label, s);
    return m;
  }, [templateDef]);

  const resolveDefaultName = (
    parentLabel: string,
    subLabel: string | null,
  ): string => {
    const untitled = t('untitled', { ns: 'common' });
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

  const docHref = (docId: string): string => {
    return `${routes.docWrite(spaceId, docId)}${modeSuffix}`;
  };

  const startAdd = (
    sectionId: string,
    parentLabel: string,
    subLabel: string | null,
  ) => {
    const value = resolveDefaultName(parentLabel, subLabel);
    setAdding({ sectionId, value });
  };

  const commitAdd = async () => {
    if (!adding) return;
    const name = adding.value.trim() || t('untitled', { ns: 'common' });
    const id = newId();
    await db.docs.add({
      id,
      spaceId,
      sectionId: adding.sectionId,
      name,
      body: '',
      meta: { wordCount: 0 },
      updatedAt: Date.now(),
    });
    setAdding(null);
    navigate(routes.docWrite(spaceId, id));
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

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2">
      <div className="group border-b border-rule px-5 pb-4 pt-5">
        {editingSpaceName ? (
          <TextField
            variant="bare"
            autoFocus
            value={draftSpaceName}
            onChange={(e) => setDraftSpaceName(e.target.value)}
            onBlur={commitSpaceName}
            onFocus={(e) => e.currentTarget.select()}
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
            {/* @lint-ignore native-button: editable-text trigger (click to rename); not a DS Button */}
            <button
              type="button"
              onClick={() => space && setEditingSpaceName(true)}
              disabled={!space}
              title={space ? t('chrome:sidebar.renameSpace') : undefined}
              data-testid="sidebar-space-title"
              className="block min-w-0 flex-1 cursor-text truncate text-left font-serif text-lg font-medium leading-tight tracking-tight text-ink"
            >
              {space?.name ?? '…'}
            </button>
            {space ? (
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
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="p-0"
                >
                  <SpaceMenuPopover
                    space={space}
                    onRename={() => setEditingSpaceName(true)}
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        )}
        <div
          data-testid="sidebar-space-subtitle"
          className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3"
        >
          {(() => {
            const base = space?.shared
              ? t('chrome:sidebar.shared')
              : t('chrome:sidebar.private');
            const age = space ? formatSpaceAge(space.createdAt, t) : null;
            return age
              ? t('chrome:sidebar.subtitleWithAge', { base, age })
              : base;
          })()}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2" data-tour="tour-sidebar-sections">
        {topSections.map((sec) => {
          const subs = subsectionsByParent.get(sec.id) ?? [];
          const ownDocs = docsBySection.get(sec.id) ?? [];
          const isWorkshop = sec.label === 'Workshop';
          return (
            <div
              key={sec.id}
              data-testid={`sidebar-section-${sec.id}`}
              className="mb-2"
            >
              <SectionHeader
                sectionId={sec.id}
                label={sec.label}
                onAdd={() => startAdd(sec.id, sec.label, null)}
              />
              {isWorkshop && (
                <BrainSpaceLink
                  spaceId={spaceId}
                  active={onBrainSpace}
                  count={notes.length}
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
              {adding?.sectionId === sec.id && (
                <AddDocInput
                  ref={inputRef}
                  sectionId={sec.id}
                  value={adding.value}
                  onChange={(v) => setAdding({ ...adding, value: v })}
                  onKeyDown={onAddKey}
                  onBlur={() => setAdding(null)}
                />
              )}
              {subs.map((sub) => {
                const subDocs = docsBySection.get(sub.id) ?? [];
                return (
                  <div
                    key={sub.id}
                    data-testid={`sidebar-section-${sub.id}`}
                    className="mt-1"
                  >
                    <SectionHeader
                      sectionId={sub.id}
                      label={`↳ ${sub.label}`}
                      indented
                      onAdd={() => startAdd(sub.id, sec.label, sub.label)}
                    />
                    {subDocs.length === 0 && adding?.sectionId !== sub.id && (
                      <div
                        data-testid={`sidebar-section-${sub.id}-empty`}
                        className="px-5 pl-7 py-1 text-[11px] italic text-ink-4"
                      >
                        {t('chrome:sidebar.empty')}
                      </div>
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
                    {adding?.sectionId === sub.id && (
                      <AddDocInput
                        ref={inputRef}
                        sectionId={sub.id}
                        value={adding.value}
                        indented
                        onChange={(v) => setAdding({ ...adding, value: v })}
                        onKeyDown={onAddKey}
                        onBlur={() => setAdding(null)}
                      />
                    )}
                  </div>
                );
              })}
              {ownDocs.length === 0 &&
                subs.length === 0 &&
                adding?.sectionId !== sec.id && (
                  <div
                    data-testid={`sidebar-section-${sec.id}-empty`}
                    className="px-5 py-1.5 text-xs italic text-ink-4"
                  >
                    {t('chrome:sidebar.empty')}
                  </div>
                )}
            </div>
          );
        })}
        {!topSections.some((s) => s.label === 'Workshop') && (
          <div
            data-testid="sidebar-workshop-fallback"
            className="mt-4 border-t border-rule pt-2"
          >
            <div
              data-testid="sidebar-workshop-fallback-label"
              className="px-5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4"
            >
              {t('chrome:sidebar.workshop')}
            </div>
            <BrainSpaceLink
              spaceId={spaceId}
              active={onBrainSpace}
              count={notes.length}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatSpaceAge(createdAt: number, t: TranslateFn): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - createdAt);
  const day = 86400000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return t('chrome:sidebar.ageNew');
  if (days < 30) return t('chrome:sidebar.ageDays', { count: days });
  if (days < 365)
    return t('chrome:sidebar.ageMonths', { count: Math.floor(days / 30) });
  return t('chrome:sidebar.ageYears', { count: Math.floor(days / 365) });
}

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
          onChange={(e) => onChange(e.target.value)}
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
        {count > 0 ? `${count}◦` : '◌'}
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
  const wordCount = countWords(doc.body);
  return (
    <Link
      to={href}
      data-testid={`sidebar-doc-${doc.id}`}
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 py-1.5 transition-colors',
        indented ? 'pl-7 pr-5' : 'px-5',
        active
          ? 'border-ink bg-paper'
          : 'border-transparent hover:bg-paper',
      )}
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
  );
};

function inferModeSuffix(pathname: string): string {
  if (pathname.endsWith('/read')) return '/read';
  if (pathname.endsWith('/split')) return '/split';
  return '';
}

function countWords(body: string): number {
  if (!body) return 0;
  try {
    const parsed = JSON.parse(body) as { root?: unknown };
    if (parsed?.root) {
      return extractTextFromLexicalState(parsed.root).trim().split(/\s+/).filter(Boolean).length;
    }
  } catch {
    /* not JSON, treat as plain text */
  }
  return body.trim().split(/\s+/).filter(Boolean).length;
}

function extractTextFromLexicalState(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as { text?: string; children?: unknown[] };
  if (typeof obj.text === 'string') return obj.text;
  if (Array.isArray(obj.children)) {
    return obj.children.map(extractTextFromLexicalState).join(' ');
  }
  return '';
}
