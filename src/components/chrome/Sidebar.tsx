import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  forwardRef,
  useMemo,
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { formatDocName } from '@/lib/doc-naming';
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

export function Sidebar({ spaceId, activeDocId }: SidebarProps) {
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

  useEffect(() => {
    if (adding && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [adding]);

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

  function resolveDefaultName(
    parentLabel: string,
    subLabel: string | null,
  ): string {
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
  }

  function docHref(docId: string): string {
    return `/s/${spaceId}/d/${docId}${modeSuffix}`;
  }

  function startAdd(
    sectionId: string,
    parentLabel: string,
    subLabel: string | null,
  ) {
    const value = resolveDefaultName(parentLabel, subLabel);
    setAdding({ sectionId, value });
  }

  async function commitAdd() {
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
    navigate(`/s/${spaceId}/d/${id}`);
  }

  function onAddKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAdding(null);
    }
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-rule bg-paper-2">
      <div className="border-b border-rule px-5 pb-4 pt-5">
        <div className="font-serif text-lg font-medium leading-tight tracking-tight text-ink">
          {space?.name ?? '…'}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {space?.shared ? t('chrome:sidebar.shared') : t('chrome:sidebar.private')}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {topSections.map((sec) => {
          const subs = subsectionsByParent.get(sec.id) ?? [];
          const ownDocs = docsBySection.get(sec.id) ?? [];
          const isWorkshop = sec.label === 'Workshop';
          return (
            <div key={sec.id} className="mb-2">
              <SectionHeader
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
                  value={adding.value}
                  onChange={(v) => setAdding({ ...adding, value: v })}
                  onKeyDown={onAddKey}
                  onBlur={() => setAdding(null)}
                />
              )}
              {subs.map((sub) => {
                const subDocs = docsBySection.get(sub.id) ?? [];
                return (
                  <div key={sub.id} className="mt-1">
                    <SectionHeader
                      label={`↳ ${sub.label}`}
                      indented
                      onAdd={() => startAdd(sub.id, sec.label, sub.label)}
                    />
                    {subDocs.length === 0 && adding?.sectionId !== sub.id && (
                      <div className="px-5 pl-7 py-1 text-[11px] italic text-ink-4">
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
                  <div className="px-5 py-1.5 text-xs italic text-ink-4">
                    {t('chrome:sidebar.empty')}
                  </div>
                )}
            </div>
          );
        })}
        {!topSections.some((s) => s.label === 'Workshop') && (
          <div className="mt-4 border-t border-rule pt-2">
            <div className="px-5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4">
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
      <div className="flex items-center gap-3 border-t border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-4">
        <Link to="/" className="hover:text-ink">
          {t('home', { ns: 'common' })}
        </Link>
        <Link to="/about" className="hover:text-ink">
          {t('about', { ns: 'common' })}
        </Link>
        <Link to="/settings" className="hover:text-ink">
          {t('settings', { ns: 'common' })}
        </Link>
        {/* TODO: replace with GitHub URL */}
        <a
          href="#"
          target="_blank"
          rel="noreferrer"
          className="hover:text-ink"
        >
          {t('github', { ns: 'common' })}
        </a>
      </div>
    </aside>
  );
}

function SectionHeader({
  label,
  indented = false,
  onAdd,
}: {
  label: string;
  indented?: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation('chrome');
  return (
    <div
      className={cn(
        'group flex items-center gap-1 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-4',
        indented ? 'pl-7 pr-3' : 'px-5',
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-ink-4 opacity-0 transition-opacity hover:bg-paper hover:text-ink group-hover:opacity-100 focus:opacity-100"
        aria-label={t('sidebar.addDocAria', { label })}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

interface AddDocInputProps {
  value: string;
  indented?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const AddDocInput = forwardRef<HTMLInputElement, AddDocInputProps>(
  function AddDocInput(
    { value, indented = false, onChange, onKeyDown, onBlur },
    ref,
  ) {
    const { t } = useTranslation('chrome');
    return (
      <div
        className={cn(
          '-ml-px flex items-center gap-2 border-l-2 border-ink py-1',
          indented ? 'pl-7 pr-3' : 'px-5',
        )}
      >
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={t('sidebar.docNamePlaceholder')}
          className="flex-1 border-0 bg-transparent p-0 text-[13px] text-ink outline-none placeholder:text-ink-4"
        />
      </div>
    );
  },
);

function BrainSpaceLink({
  spaceId,
  active,
  count,
}: {
  spaceId: string;
  active: boolean;
  count: number;
}) {
  const { t } = useTranslation('common');
  return (
    <Link
      to={`/s/${spaceId}/dump`}
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 px-5 py-1.5 transition-colors',
        active
          ? 'border-ink bg-paper font-medium text-ink'
          : 'border-transparent text-ink-2 hover:bg-paper',
      )}
    >
      <span className="flex-1 text-[13px]">{t('brainSpace')}</span>
      <span className="font-mono text-[10px] text-ink-4">
        {count > 0 ? `${count}◦` : '◌'}
      </span>
    </Link>
  );
}

function DocLink({
  doc,
  href,
  active,
  indented = false,
}: {
  doc: Doc;
  href: string;
  active: boolean;
  indented?: boolean;
}) {
  const wordCount = countWords(doc.body);
  return (
    <Link
      to={href}
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 py-1.5 transition-colors',
        indented ? 'pl-7 pr-5' : 'px-5',
        active
          ? 'border-ink bg-paper'
          : 'border-transparent hover:bg-paper',
      )}
    >
      <span
        className={cn(
          'flex-1 truncate text-[13px]',
          active ? 'font-medium text-ink' : 'text-ink-2',
        )}
      >
        {doc.name}
      </span>
      <span className="font-mono text-[10px] text-ink-4">
        {wordCount > 0 ? wordCount.toLocaleString() : '◌'}
      </span>
    </Link>
  );
}

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
