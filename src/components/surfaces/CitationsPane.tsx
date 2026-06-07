import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  X,
} from '@/components/libs/icons';
import { useCitations } from '@/hooks/useCitations';
import {
  parseBibtexFile,
  parseBibtexText,
  importCitations,
  serializeCitationsToBibtex,
} from '@/lib/bibtex';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { cn } from '@/lib/utils';
import { downloadBlob } from '@/lib/file-download';
import type { Citation } from '@/db/schema';
import { TypographyMuted, TypographyP } from '@/components/ui/typography';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/icon';
import { TextArea } from '@/components/ui/TextArea';
import { SearchField } from '@/components/ui/SearchField';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';

export type CitationsDensity = 'comfortable' | 'compact';

interface CitationsPaneProps {
  spaceId: string;
  spaceName?: string;
  density?: CitationsDensity;
}

const PAGE_SIZE = 25;

const COL_TEMPLATE_COMFORTABLE =
  'md:grid md:grid-cols-[2rem_7rem_minmax(8rem,12rem)_minmax(0,1fr)_4rem_6rem_4rem]';
const COL_TEMPLATE_COMPACT =
  'md:grid md:grid-cols-[2rem_minmax(7rem,10rem)_minmax(0,1fr)_4rem]';

const TYPE_OPTIONS: Citation['type'][] = ['book', 'article', 'chapter', 'misc'];

type RowMode = 'view' | 'edit';

type OpenRowState = { id: string; mode: RowMode } | null;

interface ImportActionsDeps {
  spaceId: string;
  spaceName: string | undefined;
  citations: Citation[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  setStatus: Dispatch<SetStateAction<string | null>>;
}

const useImportActions = ({
  spaceId,
  spaceName,
  citations,
  fileInputRef,
  setStatus,
}: ImportActionsDeps) => {
  const { t } = useTranslation('screens');

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(t('citations.parsing', { name: file.name }));
    try {
      const parsed = await parseBibtexFile(file, spaceId);
      const { added, skipped } = await importCitations(parsed);
      const addedPlural = added === 1 ? '' : 's';
      const skippedSuffix =
        skipped > 0
          ? t('citations.skippedSuffix', {
              skipped,
              skippedPlural: skipped === 1 ? '' : 's',
            })
          : '';
      setStatus(
        t('citations.imported', {
          added,
          addedPlural,
          skippedSuffix,
        }),
      );
    } catch (err) {
      console.error(err);
      setStatus(
        t('citations.failed', {
          message:
            err instanceof Error ? err.message : t('citations.unknownError'),
        }),
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const bib = serializeCitationsToBibtex(citations);
    const blob = new Blob([bib], { type: 'application/x-bibtex' });
    downloadBlob(blob, `${spaceName ?? 'space'}-citations.bib`);
  };

  return { handleFile, handleExport };
};

interface MutationActionsDeps {
  selected: Set<string>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setSelected: Dispatch<SetStateAction<Set<string>>>;
  setOpenRow: Dispatch<SetStateAction<OpenRowState>>;
}

const useMutationActions = ({
  selected,
  setStatus,
  setSelected,
  setOpenRow,
}: MutationActionsDeps) => {
  const { t } = useTranslation('screens');

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      t('citations.bulk.confirmDelete', { count: ids.length }),
    );
    if (!ok) return;
    await db.citations.bulkDelete(ids);
    setSelected(new Set());
    setStatus(t('citations.bulk.deleted', { count: ids.length }));
  };

  const deleteCitation = async (c: Citation) => {
    const confirmMsg =
      c.useCount > 0
        ? t('citations.edit.confirmDeleteUsed', { count: c.useCount })
        : t('citations.edit.confirmDeleteSingle', { key: c.key });
    if (!window.confirm(confirmMsg)) return;
    try {
      await db.citations.delete(c.id);
      setOpenRow((cur) => (cur?.id === c.id ? null : cur));
      setSelected((prev) => {
        if (!prev.has(c.id)) return prev;
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      setStatus(t('citations.edit.deleteOne'));
    } catch (err) {
      setStatus(
        t('citations.failedManual', {
          message:
            err instanceof Error ? err.message : t('citations.unknownError'),
        }),
      );
    }
  };

  const handleBulkSetType = async (type: Citation['type']) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await db.transaction('rw', db.citations, async () => {
      for (const id of ids) {
        await db.citations.update(id, { type });
      }
    });
    setStatus(
      t('citations.bulk.typeApplied', { type, count: ids.length }),
    );
  };

  return { handleBulkDelete, deleteCitation, handleBulkSetType };
};

const usePagedCitations = (citations: Citation[], query: string, page: number) => {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return citations;
    return citations.filter((c) =>
      [c.key, c.authors, c.title, String(c.year)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [citations, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () =>
      filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage],
  );

  return { filtered, totalPages, currentPage, pageRows };
};

const useRowSelection = (
  pageRows: Citation[],
  selected: Set<string>,
  setSelected: Dispatch<SetStateAction<Set<string>>>,
) => {
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleIds = pageRows.map((r) => r.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  return {
    visibleIds,
    allVisibleSelected,
    someVisibleSelected,
    toggleSelected,
    toggleSelectAllVisible,
  };
};

const useCitationsPaneController = (
  spaceId: string,
  spaceName: string | undefined,
) => {
  const citations = useCitations(spaceId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openRow, setOpenRow] = useState<OpenRowState>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
    setOpenRow(null);
  }, [query, spaceId]);

  const paged = usePagedCitations(citations, query, page);
  const selection = useRowSelection(paged.pageRows, selected, setSelected);
  const importActions = useImportActions({
    spaceId,
    spaceName,
    citations,
    fileInputRef,
    setStatus,
  });
  const mutationActions = useMutationActions({
    selected,
    setStatus,
    setSelected,
    setOpenRow,
  });

  return {
    citations,
    fileInputRef,
    status,
    setStatus,
    query,
    setQuery,
    setPage,
    adding,
    setAdding,
    openRow,
    setOpenRow,
    selected,
    setSelected,
    ...paged,
    ...selection,
    ...importActions,
    ...mutationActions,
  };
};

type CitationsController = ReturnType<typeof useCitationsPaneController>;

interface CitationsTopRegionProps {
  ctrl: CitationsController;
  spaceId: string;
  xPad: string;
  isCompact: boolean;
}

const CitationsTopRegion = ({
  ctrl: c,
  spaceId,
  xPad,
  isCompact,
}: CitationsTopRegionProps) => {
  return (
    <>
      <CitationsHeader
        xPad={xPad}
        isCompact={isCompact}
        count={c.citations.length}
      />

      <CitationsToolbar
        xPad={xPad}
        query={c.query}
        adding={c.adding}
        onQueryChange={(v) => { c.setQuery(v); }}
        onToggleAdding={() => { c.setAdding((v) => !v); }}
        onUploadClick={() => c.fileInputRef.current?.click()}
        fileInputRef={c.fileInputRef}
        onFile={(e) => { void c.handleFile(e); }}
      />

      <CitationsBanners
        xPad={xPad}
        status={c.status}
        spaceId={spaceId}
        selectedCount={c.selected.size}
        adding={c.adding}
        onClearSelected={() => { c.setSelected(new Set()); }}
        onBulkDelete={() => { void c.handleBulkDelete(); }}
        onBulkSetType={(t) => { void c.handleBulkSetType(t); }}
        onCloseAdding={() => { c.setAdding(false); }}
        onStatus={c.setStatus}
      />
    </>
  );
};

export const CitationsPane = ({
  spaceId,
  spaceName,
  density = 'comfortable',
}: CitationsPaneProps) => {
  const c = useCitationsPaneController(spaceId, spaceName);

  const isCompact = density === 'compact';
  const colTemplate = isCompact ? COL_TEMPLATE_COMPACT : COL_TEMPLATE_COMFORTABLE;
  const xPad = isCompact ? 'px-4' : 'px-4 md:px-10';

  return (
    <div
      className="flex h-full flex-1 flex-col overflow-hidden bg-paper"
      data-testid="citations-pane"
    >
      <CitationsTopRegion ctrl={c} spaceId={spaceId} xPad={xPad} isCompact={isCompact} />

      <CitationsList
        xPad={xPad}
        isCompact={isCompact}
        colTemplate={colTemplate}
        citations={c.citations}
        filtered={c.filtered}
        pageRows={c.pageRows}
        openRow={c.openRow}
        selected={c.selected}
        visibleCount={c.visibleIds.length}
        allVisibleSelected={c.allVisibleSelected}
        someVisibleSelected={c.someVisibleSelected}
        onToggleSelectAll={c.toggleSelectAllVisible}
        onToggleSelect={c.toggleSelected}
        onSetOpenRow={c.setOpenRow}
        onStatus={c.setStatus}
        onDeleteCitation={(cit) => { void c.deleteCitation(cit); }}
      />

      <CitationsFooter
        xPad={xPad}
        shown={c.filtered.length}
        onThisPage={c.pageRows.length}
        totalCitations={c.citations.length}
        currentPage={c.currentPage}
        totalPages={c.totalPages}
        onExport={c.handleExport}
        onSetPage={c.setPage}
      />
    </div>
  );
};

const EmptyState = ({ hasCitations }: { hasCitations: boolean }) => {
  const { t } = useTranslation('screens');
  return (
    <div
      className="flex items-center justify-center px-4 py-20 md:px-10"
      data-testid="citations-empty"
    >
      <div className="text-center">
        <TypographyP
          variant="empty"
          className="text-[20px]"
          data-testid="citations-empty-title"
        >
          {t('citations.empty')}
        </TypographyP>
        <TypographyMuted
          className="mt-2 text-[13px]"
          data-testid="citations-empty-hint"
        >
          {hasCitations
            ? t('citations.noMatch')
            : t('citations.importHint')}
        </TypographyMuted>
      </div>
    </div>
  );
};

const CitationsHeader = ({
  xPad,
  isCompact,
  count,
}: {
  xPad: string;
  isCompact: boolean;
  count: number;
}) => {
  const { t } = useTranslation('screens');
  return (
    <div className={cn('border-b border-rule py-4', xPad, !isCompact && 'py-6')}>
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.08em]">
          <span className="text-ink-3">{t('citations.breadcrumb')}</span>
          <span className="text-ink">{t('citations.title')}</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
          {t('citations.entries', { count })}
        </div>
      </div>
    </div>
  );
};

interface CitationsToolbarProps {
  xPad: string;
  query: string;
  adding: boolean;
  onQueryChange: (v: string) => void;
  onToggleAdding: () => void;
  onUploadClick: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}

const CitationsToolbar = ({
  xPad,
  query,
  adding,
  onQueryChange,
  onToggleAdding,
  onUploadClick,
  fileInputRef,
  onFile,
}: CitationsToolbarProps) => {
  const { t } = useTranslation('screens');
  return (
    <div
      data-tour="tour-citations-add"
      className={cn(
        'flex flex-col gap-2 border-b border-rule py-3 md:flex-row md:items-center md:justify-between md:gap-4',
        xPad,
      )}
    >
      <div className="w-full md:w-[360px] md:max-w-[40%]">
        <SearchField
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); }}
          onClear={() => { onQueryChange(''); }}
          placeholder={t('citations.searchPlaceholder')}
          className="text-[12px]"
          data-testid="citations-search"
        />
      </div>
      <div className="flex items-center gap-5 text-[11px]">
        <Button
          kind="ghost"
          size="sm"
          onClick={onUploadClick}
          data-testid="citations-upload"
        >
          {t('citations.upload')}
        </Button>
        {/* @lint-ignore native-button: muted text-action toggle ("+ add" / "× cancel"); no matching DS Button kind */}
        <button
          type="button"
          onClick={onToggleAdding}
          className="text-ink-3 hover:text-ink"
          data-testid="citations-add-toggle"
        >
          {adding ? t('citations.cancel') : t('citations.add')}
        </button>
        {/* @lint-ignore native-input: hidden file input triggered programmatically; DS primitives intentionally don't cover this case */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".bib,.bibtex,text/x-bibtex,application/x-bibtex"
          className="hidden"
          onChange={onFile}
          data-testid="citations-file-input"
        />
      </div>
    </div>
  );
};

interface CitationsListHeaderProps {
  xPad: string;
  isCompact: boolean;
  colTemplate: string;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  visibleCount: number;
  onToggleSelectAll: () => void;
}

const CitationsListHeader = ({
  xPad,
  isCompact,
  colTemplate,
  allVisibleSelected,
  someVisibleSelected,
  visibleCount,
  onToggleSelectAll,
}: CitationsListHeaderProps) => {
  const { t } = useTranslation('screens');
  return (
    <div
      className={cn(
        colTemplate,
        'sticky top-0 z-10 hidden gap-4 border-b border-rule bg-paper py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3',
        xPad,
      )}
    >
      <span className="flex items-center">
        <Checkbox
          checked={allVisibleSelected}
          ref={(el) => {
            if (el)
              el.indeterminate = !allVisibleSelected && someVisibleSelected;
          }}
          onChange={onToggleSelectAll}
          aria-label={t('citations.row.selectAllAria')}
          disabled={visibleCount === 0}
          data-testid="citations-select-all"
        />
      </span>
      {!isCompact && <span>{t('citations.columns.tag')}</span>}
      <span>{t('citations.columns.authors')}</span>
      <span>{t('citations.columns.title')}</span>
      <span>{t('citations.columns.year')}</span>
      {!isCompact && <span>{t('citations.columns.type')}</span>}
      {!isCompact && (
        <span className="text-right">{t('citations.columns.used')}</span>
      )}
    </div>
  );
};

interface CitationsBannersProps {
  xPad: string;
  status: string | null;
  spaceId: string;
  selectedCount: number;
  adding: boolean;
  onClearSelected: () => void;
  onBulkDelete: () => void;
  onBulkSetType: (t: Citation['type']) => void;
  onCloseAdding: () => void;
  onStatus: (s: string | null) => void;
}

const CitationsBanners = ({
  xPad,
  status,
  spaceId,
  selectedCount,
  adding,
  onClearSelected,
  onBulkDelete,
  onBulkSetType,
  onCloseAdding,
  onStatus,
}: CitationsBannersProps) => {
  return (
    <>
      {status && (
        <div
          className={cn(
            'border-b border-rule bg-paper-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3',
            xPad,
          )}
          role="status"
          data-testid="citations-status"
        >
          {status}
        </div>
      )}

      {selectedCount > 0 && (
        <BulkBar
          xPad={xPad}
          count={selectedCount}
          onClear={onClearSelected}
          onDelete={onBulkDelete}
          onSetType={onBulkSetType}
        />
      )}

      {adding && (
        <ManualAddForm
          spaceId={spaceId}
          xPad={xPad}
          onClose={onCloseAdding}
          onStatus={onStatus}
        />
      )}
    </>
  );
};

interface CitationsListProps {
  xPad: string;
  isCompact: boolean;
  colTemplate: string;
  citations: Citation[];
  filtered: Citation[];
  pageRows: Citation[];
  openRow: OpenRowState;
  selected: Set<string>;
  visibleCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onSetOpenRow: Dispatch<SetStateAction<OpenRowState>>;
  onStatus: (s: string | null) => void;
  onDeleteCitation: (c: Citation) => void;
}

const CitationsList = ({
  xPad,
  isCompact,
  colTemplate,
  citations,
  filtered,
  pageRows,
  openRow,
  selected,
  visibleCount,
  allVisibleSelected,
  someVisibleSelected,
  onToggleSelectAll,
  onToggleSelect,
  onSetOpenRow,
  onStatus,
  onDeleteCitation,
}: CitationsListProps) => {
  return (
    <div className="flex-1 overflow-auto" data-tour="tour-citations-list">
      <CitationsListHeader
        xPad={xPad}
        isCompact={isCompact}
        colTemplate={colTemplate}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        visibleCount={visibleCount}
        onToggleSelectAll={onToggleSelectAll}
      />

      {filtered.length === 0 ? (
        <EmptyState hasCitations={citations.length > 0} />
      ) : (
        pageRows.map((c) => (
          <CitationRowItem
            key={c.id}
            citation={c}
            open={openRow?.id === c.id ? openRow : null}
            isCompact={isCompact}
            colTemplate={colTemplate}
            xPad={xPad}
            isSelected={selected.has(c.id)}
            onToggleSelect={() => { onToggleSelect(c.id); }}
            onSetOpenRow={onSetOpenRow}
            onStatus={onStatus}
            onDeleteCitation={onDeleteCitation}
          />
        ))
      )}
    </div>
  );
};

interface CitationRowItemProps {
  citation: Citation;
  open: OpenRowState;
  isCompact: boolean;
  colTemplate: string;
  xPad: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSetOpenRow: Dispatch<SetStateAction<OpenRowState>>;
  onStatus: (s: string | null) => void;
  onDeleteCitation: (c: Citation) => void;
}

const CitationRowItem = ({
  citation: c,
  open,
  isCompact,
  colTemplate,
  xPad,
  isSelected,
  onToggleSelect,
  onSetOpenRow,
  onStatus,
  onDeleteCitation,
}: CitationRowItemProps) => {
  const { t } = useTranslation('screens');
  const mode = open?.id === c.id ? open.mode : null;
  if (mode === 'edit') {
    return (
      <CitationEditRow
        citation={c}
        xPad={xPad}
        onCancel={() => { onSetOpenRow({ id: c.id, mode: 'view' }); }}
        onSaved={() => {
          onSetOpenRow({ id: c.id, mode: 'view' });
          onStatus(t('citations.edit.updated'));
        }}
        onDelete={() => { onDeleteCitation(c); }}
        onError={(msg) => { onStatus(msg); }}
      />
    );
  }
  if (mode === 'view') {
    return (
      <CitationDetailRow
        citation={c}
        xPad={xPad}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onEdit={() => { onSetOpenRow({ id: c.id, mode: 'edit' }); }}
        onDelete={() => { onDeleteCitation(c); }}
        onClose={() => { onSetOpenRow(null); }}
      />
    );
  }
  return (
    <CitationRow
      citation={c}
      isCompact={isCompact}
      colTemplate={colTemplate}
      xPad={xPad}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      onExpand={() => { onSetOpenRow({ id: c.id, mode: 'view' }); }}
    />
  );
};

interface CitationsFooterProps {
  xPad: string;
  shown: number;
  onThisPage: number;
  totalCitations: number;
  currentPage: number;
  totalPages: number;
  onExport: () => void;
  onSetPage: Dispatch<SetStateAction<number>>;
}

const CitationsFooter = ({
  xPad,
  shown,
  onThisPage,
  totalCitations,
  currentPage,
  totalPages,
  onExport,
  onSetPage,
}: CitationsFooterProps) => {
  const { t } = useTranslation('screens');
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-t border-rule py-3 font-mono text-[10px] uppercase tracking-wider text-ink-3 md:flex-row md:items-center md:justify-between',
        xPad,
      )}
    >
      <span>{t('citations.style')}</span>

      <div className="flex items-center gap-3">
        <span data-testid="citations-counts">
          {t('citations.summary', { filtered: shown, shown: onThisPage })}
        </span>
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onSetPage={onSetPage}
          />
        )}
      </div>
            <Button
        kind="ghost"
        size="xs"
        onClick={onExport}
        disabled={totalCitations === 0}
        data-testid="citations-export"
      >
        {t('citations.exportBib')}
      </Button>
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onSetPage: Dispatch<SetStateAction<number>>;
}

const Pagination = ({ currentPage, totalPages, onSetPage }: PaginationProps) => {
  const { t } = useTranslation('screens');
  return (
    <span className="flex items-center gap-2">
      <IconButton
        icon={ChevronLeft}
        label={t('citations.prevPage')}
        onClick={() => { onSetPage((p) => Math.max(0, p - 1)); }}
        disabled={currentPage === 0}
        iconSize="xs"
        className="h-5 w-5"
        data-testid="citations-prev-page"
      />
      <span data-testid="citations-page-indicator">
        {currentPage + 1}/{totalPages}
      </span>
      <IconButton
        icon={ChevronRight}
        label={t('citations.nextPage')}
        onClick={() => { onSetPage((p) => Math.min(totalPages - 1, p + 1)); }}
        disabled={currentPage >= totalPages - 1}
        iconSize="xs"
        className="h-5 w-5"
        data-testid="citations-next-page"
      />
    </span>
  );
};

interface CitationRowProps {
  citation: Citation;
  isCompact: boolean;
  colTemplate: string;
  xPad: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onExpand: () => void;
}

const CitationRow = ({
  citation: c,
  isCompact,
  colTemplate,
  xPad,
  isSelected,
  onToggleSelect,
  onExpand,
}: CitationRowProps) => {
  const { t } = useTranslation('screens');
  const handleRowClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, a, select, label')) return;
    onExpand();
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExpand();
    }
  };

  const rowTestId = `citation-row-${c.id}`;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      aria-label={t('citations.row.viewCitationAria', { key: c.key })}
      data-testid={rowTestId}
      className={cn(
        'flex cursor-pointer flex-col gap-1 border-b border-rule py-3 hover:bg-paper-2 focus:bg-paper-2 focus:outline-none md:items-baseline md:gap-4 md:py-2.5',
        colTemplate,
        xPad,
      )}
    >
      <span className="flex items-center">
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => { e.stopPropagation(); }}
          aria-label={t('citations.row.selectCitationAria', { key: c.key })}
          data-testid={`${rowTestId}-select`}
        />
      </span>
      <CitationRowMainCells
        citation={c}
        isCompact={isCompact}
        rowTestId={rowTestId}
      />
      <CitationRowMeta citation={c} isCompact={isCompact} rowTestId={rowTestId} />
    </div>
  );
};

const CitationRowMainCells = ({
  citation: c,
  isCompact,
  rowTestId,
}: {
  citation: Citation;
  isCompact: boolean;
  rowTestId: string;
}) => {
  return (
    <>
      {!isCompact && (
        <span
          className="hidden truncate font-mono text-[11px] text-ink md:inline"
          data-testid={`${rowTestId}-tag`}
        >
          {c.key}
        </span>
      )}
      <span className="font-serif text-[16px] text-ink md:hidden">
        {c.title}
      </span>
      <span
        className="truncate font-serif text-[14px] italic text-ink"
        data-testid={`${rowTestId}-authors`}
      >
        {c.authors}
      </span>
      <span
        className="hidden truncate font-serif text-[14px] text-ink-2 md:inline"
        data-testid={`${rowTestId}-title`}
      >
        {c.title}
      </span>
      <span
        className="hidden font-mono text-[11px] text-ink-3 md:inline"
        data-testid={`${rowTestId}-year`}
      >
        {c.year > 0 ? c.year : '—'}
      </span>
    </>
  );
};

const CitationRowMeta = ({
  citation: c,
  isCompact,
  rowTestId,
}: {
  citation: Citation;
  isCompact: boolean;
  rowTestId: string;
}) => {
  const { t } = useTranslation('screens');
  return (
    <>
      {!isCompact && (
        <span
          className="hidden font-mono text-[9px] uppercase tracking-wider text-ink-3 md:inline"
          data-testid={`${rowTestId}-type`}
        >
          {c.type}
        </span>
      )}
      {!isCompact && (
        <span
          className="hidden text-right font-mono text-[11px] text-ink md:inline"
          data-testid={`${rowTestId}-used`}
        >
          {c.useCount > 0 ? `${String(c.useCount)}×` : '—'}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3 md:hidden">
        <span>{c.key}</span>
        <span className="text-ink-4">·</span>
        <span>{c.year > 0 ? c.year : '—'}</span>
        <span className="text-ink-4">·</span>
        <span>{c.type}</span>
        <span className="text-ink-4">·</span>
        <span>
          {c.useCount > 0
            ? t('citations.row.usedCount', { count: c.useCount })
            : t('citations.row.unused')}
        </span>
      </div>
    </>
  );
};

const CopyTagButton = ({
  value,
  testId,
}: {
  value: string;
  testId?: string;
}) => {
  const { t } = useTranslation('screens');
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { setCopied(false); }, 1500);
    } catch {
      // ignore — clipboard may be blocked in some contexts
    }
  };

  return (
    <IconButton
      icon={copied ? Check : Copy}
      label={
        copied
          ? t('citations.row.copiedTagAria', { value })
          : t('citations.row.copyTagAria', { value })
      }
      title={copied ? t('citations.row.copiedTitle') : t('citations.row.copyTag')}
      onClick={() => { void handleCopy(); }}
      iconSize="xs"
      className="h-5 w-5"
      data-testid={testId}
    />
  );
};

interface CitationDetailRowProps {
  citation: Citation;
  xPad: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const CitationDetailRow = ({
  citation: c,
  xPad,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onClose,
}: CitationDetailRowProps) => {
  const { t } = useTranslation('screens');
  const labelCls = 'font-mono text-[10px] uppercase tracking-wider text-ink-3';
  const valueCls = 'text-[13px] text-ink';

  const detailTestId = `citation-detail-${c.id}`;
  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-3 md:py-4', xPad)}
      data-testid={detailTestId}
    >
      <CitationDetailHeader
        citation={c}
        detailTestId={detailTestId}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onClose={onClose}
      />
      <CitationDetailFields
        citation={c}
        detailTestId={detailTestId}
        labelCls={labelCls}
        valueCls={valueCls}
      />
      <div className="mt-3 flex flex-col gap-1">
        <span className={labelCls}>{t('citations.edit.titleLabel')}</span>
        <span
          className={cn(valueCls, 'font-serif')}
          data-testid={`${detailTestId}-title`}
        >
          {c.title}
        </span>
      </div>
      <CitationDetailActions
        citation={c}
        detailTestId={detailTestId}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

interface CitationDetailHeaderProps {
  citation: Citation;
  detailTestId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClose: () => void;
}

const CitationDetailHeader = ({
  citation: c,
  detailTestId,
  isSelected,
  onToggleSelect,
  onClose,
}: CitationDetailHeaderProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mb-3 flex items-center justify-between">
      <Label
        tone="ink3"
        weight="regular"
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
      >
        <Checkbox
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={t('citations.row.selectCitationAria', { key: c.key })}
          data-testid={`${detailTestId}-select`}
        />
        {c.key}
      </Label>
      <IconButton
        icon={X}
        label={t('citations.row.collapseCitationAria', { key: c.key })}
        onClick={onClose}
        iconSize="xs"
        className="h-5 w-5"
        data-testid={`${detailTestId}-close`}
      />
    </div>
  );
};

interface CitationDetailActionsProps {
  citation: Citation;
  detailTestId: string;
  onEdit: () => void;
  onDelete: () => void;
}

const CitationDetailActions = ({
  citation: c,
  detailTestId,
  onEdit,
  onDelete,
}: CitationDetailActionsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mt-3 flex items-center justify-between text-[11px]">
      <span
        className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
        data-testid={`${detailTestId}-used`}
      >
        {c.useCount > 0
          ? t('citations.row.usedCount', { count: c.useCount })
          : t('citations.row.unused')}
      </span>
      <div className="flex items-center gap-3">
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onDelete}
          className="text-ink-3 hover:text-ink"
          data-testid={`${detailTestId}-delete`}
        >
          {t('citations.edit.delete')}
        </button>
        <Button
          kind="ghost"
          size="sm"
          onClick={onEdit}
          data-testid={`${detailTestId}-edit`}
        >
          {t('citations.edit.edit')}
        </Button>
      </div>
    </div>
  );
};

interface CitationDetailFieldsProps {
  citation: Citation;
  detailTestId: string;
  labelCls: string;
  valueCls: string;
}

const CitationDetailFields = ({
  citation: c,
  detailTestId,
  labelCls,
  valueCls,
}: CitationDetailFieldsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="grid gap-3 md:grid-cols-[7rem_1fr_5rem_7rem]">
      <div className="flex flex-col gap-1">
        <span className={cn(labelCls, 'flex items-center gap-1.5')}>
          {t('citations.edit.tagLabel')}
          <CopyTagButton value={c.key} testId={`${detailTestId}-copy`} />
        </span>
        <span
          className={cn(valueCls, 'font-mono break-all')}
          data-testid={`${detailTestId}-tag`}
        >
          {c.key}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelCls}>{t('citations.edit.authorsLabel')}</span>
        <span
          className={cn(valueCls, 'font-serif italic')}
          data-testid={`${detailTestId}-authors`}
        >
          {c.authors}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelCls}>{t('citations.edit.yearLabel')}</span>
        <span
          className={cn(valueCls, 'font-mono')}
          data-testid={`${detailTestId}-year`}
        >
          {c.year > 0 ? c.year : '—'}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelCls}>{t('citations.edit.typeLabel')}</span>
        <span
          className={cn(valueCls, 'font-mono uppercase tracking-wider')}
          data-testid={`${detailTestId}-type`}
        >
          {c.type}
        </span>
      </div>
    </div>
  );
};

interface CitationEditRowProps {
  citation: Citation;
  xPad: string;
  onCancel: () => void;
  onSaved: () => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}

interface EditDraft {
  key: string;
  authors: string;
  title: string;
  year: string;
  type: Citation['type'];
}

const parseYear = (raw: string): number => {
  const v = raw.trim();
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

const useCitationEdit = (
  c: Citation,
  onSaved: () => void,
  onError: (msg: string) => void,
) => {
  const { t } = useTranslation('screens');
  const [draft, setDraft] = useState<EditDraft>({
    key: c.key,
    authors: c.authors,
    title: c.title,
    year: c.year > 0 ? String(c.year) : '',
    type: c.type,
  });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      const trimmedKey = draft.key.trim() || c.key;
      const trimmedTitle = draft.title.trim() || t('citations.edit.untitled');
      const trimmedAuthors = draft.authors.trim() || t('citations.unknownAuthor');
      const yearNum = parseYear(draft.year);

      if (trimmedKey !== c.key) {
        const existing = await db.citations
          .where('[spaceId+key]')
          .equals([c.spaceId, trimmedKey])
          .first();
        if (existing && existing.id !== c.id) {
          onError(t('citations.edit.duplicateKey', { key: trimmedKey }));
          setBusy(false);
          return;
        }
      }

      await db.citations.update(c.id, {
        key: trimmedKey,
        authors: trimmedAuthors,
        title: trimmedTitle,
        year: yearNum,
        type: draft.type,
      });
      onSaved();
    } catch (err) {
      onError(
        t('citations.failedManual', {
          message:
            err instanceof Error ? err.message : t('citations.unknownError'),
        }),
      );
      setBusy(false);
    }
  };

  return { draft, setDraft, busy, handleSave };
};

const CitationEditRow = ({
  citation: c,
  xPad,
  onCancel,
  onSaved,
  onDelete,
  onError,
}: CitationEditRowProps) => {
  const { draft, setDraft, busy, handleSave } = useCitationEdit(
    c,
    onSaved,
    onError,
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  };

  const editTestId = `citation-edit-${c.id}`;
  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-3 md:py-4', xPad)}
      onKeyDown={handleKeyDown}
      data-testid={editTestId}
    >
      <CitationEditFields
        draft={draft}
        setDraft={setDraft}
        editTestId={editTestId}
      />
      <CitationEditActions
        busy={busy}
        editTestId={editTestId}
        onCancel={onCancel}
        onDelete={onDelete}
        onSave={() => { void handleSave(); }}
      />
    </div>
  );
};

// Inline-edit form uses bordered (not baseline) inputs — DS TextField currently exposes baseline/bare only.
// Bordered variant tracked for PR 5; until then these stay raw with @lint-ignore native-input.
const EDIT_INPUT_CLS =
  'w-full rounded-sm border border-rule bg-paper px-2 py-1 text-[13px] text-ink outline-none focus:border-ink';
const EDIT_LABEL_CLS =
  'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-wider';

interface CitationEditFieldsProps {
  draft: EditDraft;
  setDraft: Dispatch<SetStateAction<EditDraft>>;
  editTestId: string;
}

const CitationEditFields = ({
  draft,
  setDraft,
  editTestId,
}: CitationEditFieldsProps) => {
  const { t } = useTranslation('screens');
  return (
    <>
      <CitationEditGrid
        draft={draft}
        setDraft={setDraft}
        editTestId={editTestId}
      />
      <Label tone="ink3" weight="regular" className={cn(EDIT_LABEL_CLS, 'mt-3')}>
        {t('citations.edit.titleLabel')}
        {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
        <input
          type="text"
          value={draft.title}
          onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); }}
          className={EDIT_INPUT_CLS}
          aria-label={t('citations.edit.titleLabel')}
          data-testid={`${editTestId}-title`}
        />
      </Label>
    </>
  );
};

interface EditTextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  mono?: boolean;
  numeric?: boolean;
  autoFocus?: boolean;
}

const EditTextField = ({
  label,
  value,
  onChange,
  testId,
  mono = false,
  numeric = false,
  autoFocus = false,
}: EditTextFieldProps) => {
  return (
    <Label tone="ink3" weight="regular" className={EDIT_LABEL_CLS}>
      {label}
      {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
      <input
        type="text"
        inputMode={numeric ? 'numeric' : undefined}
        pattern={numeric ? '[0-9]*' : undefined}
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className={cn(EDIT_INPUT_CLS, mono && 'font-mono')}
        autoFocus={autoFocus}
        aria-label={label}
        data-testid={testId}
      />
    </Label>
  );
};

const CitationEditGrid = ({
  draft,
  setDraft,
  editTestId,
}: CitationEditFieldsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="grid gap-3 md:grid-cols-[7rem_1fr_5rem_7rem]">
      <EditTextField
        label={t('citations.edit.tagLabel')}
        value={draft.key}
        onChange={(v) => { setDraft((d) => ({ ...d, key: v })); }}
        testId={`${editTestId}-tag`}
        mono
        autoFocus
      />
      <EditTextField
        label={t('citations.edit.authorsLabel')}
        value={draft.authors}
        onChange={(v) => { setDraft((d) => ({ ...d, authors: v })); }}
        testId={`${editTestId}-authors`}
      />
      <EditTextField
        label={t('citations.edit.yearLabel')}
        value={draft.year}
        onChange={(v) => { setDraft((d) => ({ ...d, year: v })); }}
        testId={`${editTestId}-year`}
        mono
        numeric
      />
      <Label tone="ink3" weight="regular" className={EDIT_LABEL_CLS}>
        {t('citations.edit.typeLabel')}
        {/* @lint-ignore native-select: bordered inline-edit select; matching variant for DS Select tracked for PR 5 */}
        <select
          value={draft.type}
          onChange={(e) =>
            { setDraft((d) => ({
              ...d,
              type: e.target.value as Citation['type'],
            })); }
          }
          className={EDIT_INPUT_CLS}
          aria-label={t('citations.edit.typeLabel')}
          data-testid={`${editTestId}-type`}
        >
          {TYPE_OPTIONS.map((tOpt) => (
            <option key={tOpt} value={tOpt}>
              {tOpt}
            </option>
          ))}
        </select>
      </Label>
    </div>
  );
};

interface CitationEditActionsProps {
  busy: boolean;
  editTestId: string;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}

const CitationEditActions = ({
  busy,
  editTestId,
  onCancel,
  onDelete,
  onSave,
}: CitationEditActionsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mt-3 flex items-center justify-between text-[11px]">
      {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="text-ink-3 hover:text-ink disabled:opacity-50"
        data-testid={`${editTestId}-delete`}
      >
        {t('citations.edit.delete')}
      </button>
      <div className="flex items-center gap-3">
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-ink-3 hover:text-ink disabled:opacity-50"
          data-testid={`${editTestId}-cancel`}
        >
          {t('citations.edit.cancel')}
        </button>
        <Button
          kind="ghost"
          size="sm"
          onClick={onSave}
          disabled={busy}
          data-testid={`${editTestId}-save`}
        >
          {busy ? t('citations.edit.saving') : t('citations.edit.save')}
        </Button>
      </div>
    </div>
  );
};

interface BulkBarProps {
  xPad: string;
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onSetType: (t: Citation['type']) => void;
}

const BulkBar = ({ xPad, count, onClear, onDelete, onSetType }: BulkBarProps) => {
  const { t } = useTranslation('screens');
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-rule bg-paper-2 py-2 text-[11px] md:flex-row md:items-center md:justify-between',
        xPad,
      )}
      role="region"
      aria-label={t('citations.bulk.ariaLabel')}
      data-testid="citations-bulk-bar"
    >
      <span
        className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
        data-testid="citations-bulk-bar-count"
      >
        {t('citations.bulk.selectedSummary', { count })}
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <BulkSetTypeSelect onSetType={onSetType} />
        <Button
          kind="ghost"
          size="sm"
          onClick={onDelete}
          data-testid="citations-bulk-delete"
        >
          {t('citations.bulk.deleteSelected')}
        </Button>
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onClear}
          className="text-ink-3 hover:text-ink"
          data-testid="citations-bulk-clear"
        >
          {t('citations.bulk.clearSelection')}
        </button>
      </div>
    </div>
  );
};

const BulkSetTypeSelect = ({
  onSetType,
}: {
  onSetType: (t: Citation['type']) => void;
}) => {
  const { t } = useTranslation('screens');
  return (
    <Label
      tone="ink3"
      weight="regular"
      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
    >
      {t('citations.bulk.setTypePrompt')}
      {/* @lint-ignore native-select: bordered bulk-action select; matching variant for DS Select tracked for PR 5 */}
      <select
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value as Citation['type'] | '';
          if (!v) return;
          onSetType(v);
          e.currentTarget.value = '';
        }}
        aria-label={t('citations.bulk.setTypeAria')}
        className="rounded-sm border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink outline-none focus:border-ink"
        data-testid="citations-bulk-set-type"
      >
        <option value="" disabled>
          {t('citations.bulk.chooseOption')}
        </option>
        {TYPE_OPTIONS.map((tOpt) => (
          <option key={tOpt} value={tOpt}>
            {tOpt}
          </option>
        ))}
      </select>
    </Label>
  );
};

interface ManualAddFormProps {
  spaceId: string;
  xPad: string;
  onClose: () => void;
  onStatus: (s: string | null) => void;
}

const useManualAdd = ({
  spaceId,
  onClose,
  onStatus,
}: Omit<ManualAddFormProps, 'xPad'>) => {
  const { t } = useTranslation('screens');
  const [raw, setRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!raw.trim()) return;
    setSubmitting(true);
    try {
      if (raw.trim().startsWith('@')) {
        const parsed = await parseBibtexText(raw, spaceId);
        const { added, skipped } = await importCitations(parsed);
        const addedPlural = added === 1 ? '' : 's';
        const skippedSuffix =
          skipped > 0
            ? t('citations.skippedSuffixShort', { skipped })
            : '';
        onStatus(
          t('citations.imported', { added, addedPlural, skippedSuffix }),
        );
      } else {
        const newCitation: Citation = {
          id: newId(),
          spaceId,
          key: `manual-${String(Date.now())}`,
          authors: t('citations.unknownAuthor'),
          title: raw.trim(),
          year: 0,
          type: 'misc',
          useCount: 0,
        };
        await db.citations.add(newCitation);
        onStatus(t('citations.addedOne'));
      }
      setRaw('');
      onClose();
    } catch (err) {
      onStatus(
        t('citations.failedManual', {
          message:
            err instanceof Error ? err.message : t('citations.unknownError'),
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return { raw, setRaw, submitting, onSubmit };
};

const ManualAddForm = ({ spaceId, xPad, onClose, onStatus }: ManualAddFormProps) => {
  const { t } = useTranslation('screens');
  const { raw, setRaw, submitting, onSubmit } = useManualAdd({
    spaceId,
    onClose,
    onStatus,
  });

  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-4', xPad)}
      data-testid="citations-manual-add"
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {t('citations.pasteHeader')}
      </div>
      <TextArea
        value={raw}
        onChange={(e) => { setRaw(e.target.value); }}
        rows={4}
        placeholder={t('citations.manualAdd.bibtexPlaceholder')}
        className="rounded-sm font-mono text-[12px] placeholder:not-italic placeholder:font-mono"
        data-testid="citations-manual-add-input"
      />
      <div className="mt-2 flex items-center justify-end gap-3 text-[11px]">
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink"
          data-testid="citations-manual-add-cancel"
        >
          {t('citations.manualCancel')}
        </button>
        <Button
          kind="ghost"
          size="sm"
          onClick={() => { void onSubmit(); }}
          disabled={submitting || !raw.trim()}
          data-testid="citations-manual-add-submit"
        >
          {submitting ? t('citations.adding') : t('citations.addCitation')}
        </Button>
      </div>
    </div>
  );
};
