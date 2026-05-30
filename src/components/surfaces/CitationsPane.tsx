import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
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

export const CitationsPane = ({
  spaceId,
  spaceName,
  density = 'comfortable',
}: CitationsPaneProps) => {
  const citations = useCitations(spaceId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openRow, setOpenRow] = useState<{ id: string; mode: RowMode } | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
    setOpenRow(null);
  }, [query, spaceId]);

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

  const isCompact = density === 'compact';
  const colTemplate = isCompact ? COL_TEMPLATE_COMPACT : COL_TEMPLATE_COMFORTABLE;
  const xPad = isCompact ? 'px-4' : 'px-4 md:px-10';

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

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(`Parsing ${file.name}…`);
    try {
      const parsed = await parseBibtexFile(file, spaceId);
      const { added, skipped } = await importCitations(parsed);
      setStatus(
        `Imported ${added} citation${added === 1 ? '' : 's'}${
          skipped > 0
            ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}`
            : ''
        }.`,
      );
    } catch (err) {
      console.error(err);
      setStatus(
        `Failed to parse: ${err instanceof Error ? err.message : 'unknown error'}`,
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

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} citation${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
    );
    if (!ok) return;
    await db.citations.bulkDelete(ids);
    setSelected(new Set());
    setStatus(`Deleted ${ids.length} citation${ids.length === 1 ? '' : 's'}.`);
  };

  const deleteCitation = async (c: Citation) => {
    const confirmMsg =
      c.useCount > 0
        ? `This citation is used ${c.useCount}× in your documents. Delete anyway?`
        : `Delete citation "${c.key}"? This cannot be undone.`;
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
      setStatus('Deleted 1 citation.');
    } catch (err) {
      setStatus(
        `Failed: ${err instanceof Error ? err.message : 'unknown error'}`,
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
      `Set type to ${type} on ${ids.length} citation${ids.length === 1 ? '' : 's'}.`,
    );
  };

  return (
    <div
      className="flex h-full flex-1 flex-col overflow-hidden bg-paper"
      data-testid="citations-pane"
    >
      <div className={cn('border-b border-rule py-4', xPad, !isCompact && 'py-6')}>
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em]">
            <span className="text-ink-3">Sources / </span>
            <span className="text-ink">Citations</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
            {citations.length} ENTRIES
          </div>
        </div>
      </div>

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
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="authors, tags, year…"
            className="text-[12px]"
            data-testid="citations-search"
          />
        </div>
        <div className="flex items-center gap-5 text-[11px]">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="citations-upload"
          >
            ↑ upload .bib / .ris
          </Button>
          {/* @lint-ignore native-button: muted text-action toggle ("+ add" / "× cancel"); no matching DS Button kind */}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-ink-3 hover:text-ink"
            data-testid="citations-add-toggle"
          >
            {adding ? '× cancel' : '+ add'}
          </button>
          {/* @lint-ignore native-input: hidden file input triggered programmatically; DS primitives intentionally don't cover this case */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".bib,.bibtex,text/x-bibtex,application/x-bibtex"
            className="hidden"
            onChange={handleFile}
            data-testid="citations-file-input"
          />
        </div>
      </div>

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

      {selected.size > 0 && (
        <BulkBar
          xPad={xPad}
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onDelete={handleBulkDelete}
          onSetType={handleBulkSetType}
        />
      )}

      {adding && (
        <ManualAddForm
          spaceId={spaceId}
          xPad={xPad}
          onClose={() => setAdding(false)}
          onStatus={setStatus}
        />
      )}

      <div className="flex-1 overflow-auto" data-tour="tour-citations-list">
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
                  el.indeterminate =
                    !allVisibleSelected && someVisibleSelected;
              }}
              onChange={toggleSelectAllVisible}
              aria-label="Select all citations on this page"
              disabled={visibleIds.length === 0}
              data-testid="citations-select-all"
            />
          </span>
          {!isCompact && <span>TAG</span>}
          <span>AUTHORS</span>
          <span>TITLE</span>
          <span>YEAR</span>
          {!isCompact && <span>TYPE</span>}
          {!isCompact && <span className="text-right">USED</span>}
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasCitations={citations.length > 0} />
        ) : (
          pageRows.map((c) => {
            const open = openRow?.id === c.id ? openRow : null;
            if (open?.mode === 'edit') {
              return (
                <CitationEditRow
                  key={c.id}
                  citation={c}
                  xPad={xPad}
                  onCancel={() => setOpenRow({ id: c.id, mode: 'view' })}
                  onSaved={() => {
                    setOpenRow({ id: c.id, mode: 'view' });
                    setStatus('Updated 1 citation.');
                  }}
                  onDelete={() => deleteCitation(c)}
                  onError={(msg) => setStatus(msg)}
                />
              );
            }
            if (open?.mode === 'view') {
              return (
                <CitationDetailRow
                  key={c.id}
                  citation={c}
                  xPad={xPad}
                  isSelected={selected.has(c.id)}
                  onToggleSelect={() => toggleSelected(c.id)}
                  onEdit={() => setOpenRow({ id: c.id, mode: 'edit' })}
                  onDelete={() => deleteCitation(c)}
                  onClose={() => setOpenRow(null)}
                />
              );
            }
            return (
              <CitationRow
                key={c.id}
                citation={c}
                isCompact={isCompact}
                colTemplate={colTemplate}
                xPad={xPad}
                isSelected={selected.has(c.id)}
                onToggleSelect={() => toggleSelected(c.id)}
                onExpand={() => setOpenRow({ id: c.id, mode: 'view' })}
              />
            );
          })
        )}
      </div>

      <div
        className={cn(
          'flex flex-col gap-2 border-t border-rule py-3 font-mono text-[10px] uppercase tracking-wider text-ink-3 md:flex-row md:items-center md:justify-between',
          xPad,
        )}
      >
        <span>STYLE — CHICAGO (AUTHOR-DATE)</span>
        <Button
          kind="ghost"
          size="sm"
          onClick={handleExport}
          disabled={citations.length === 0}
          data-testid="citations-export"
        >
          EXPORT AS .BIB
        </Button>
        <div className="flex items-center gap-3">
          <span data-testid="citations-counts">
            {filtered.length} SHOWN · {pageRows.length} ON THIS PAGE
          </span>
          {totalPages > 1 && (
            <span className="flex items-center gap-2">
              <IconButton
                icon={ChevronLeft}
                label="Previous page"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                label="Next page"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={currentPage >= totalPages - 1}
                iconSize="xs"
                className="h-5 w-5"
                data-testid="citations-next-page"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ hasCitations }: { hasCitations: boolean }) => {
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
          no citations yet
        </TypographyP>
        <TypographyMuted
          className="mt-2 text-[13px]"
          data-testid="citations-empty-hint"
        >
          {hasCitations
            ? 'no rows match your search.'
            : 'import a .bib or add one manually.'}
        </TypographyMuted>
      </div>
    </div>
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
      aria-label={`View citation ${c.key}`}
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
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select citation ${c.key}`}
          data-testid={`${rowTestId}-select`}
        />
      </span>
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
          {c.useCount > 0 ? `${c.useCount}×` : '—'}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3 md:hidden">
        <span>{c.key}</span>
        <span className="text-ink-4">·</span>
        <span>{c.year > 0 ? c.year : '—'}</span>
        <span className="text-ink-4">·</span>
        <span>{c.type}</span>
        <span className="text-ink-4">·</span>
        <span>{c.useCount > 0 ? `${c.useCount}× used` : 'unused'}</span>
      </div>
    </div>
  );
};

const CopyTagButton = ({
  value,
  testId,
}: {
  value: string;
  testId?: string;
}) => {
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
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked in some contexts
    }
  };

  return (
    <IconButton
      icon={copied ? Check : Copy}
      label={copied ? `Copied tag ${value}` : `Copy tag ${value}`}
      title={copied ? 'Copied' : 'Copy tag'}
      onClick={handleCopy}
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
  const labelCls = 'font-mono text-[10px] uppercase tracking-wider text-ink-3';
  const valueCls = 'text-[13px] text-ink';

  const detailTestId = `citation-detail-${c.id}`;
  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-3 md:py-4', xPad)}
      data-testid={detailTestId}
    >
      <div className="mb-3 flex items-center justify-between">
        <Label
          tone="ink3"
          weight="regular"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
        >
          <Checkbox
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select citation ${c.key}`}
            data-testid={`${detailTestId}-select`}
          />
          {c.key}
        </Label>
        <IconButton
          icon={X}
          label={`Collapse citation ${c.key}`}
          onClick={onClose}
          iconSize="xs"
          className="h-5 w-5"
          data-testid={`${detailTestId}-close`}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[7rem_1fr_5rem_7rem]">
        <div className="flex flex-col gap-1">
          <span className={cn(labelCls, 'flex items-center gap-1.5')}>
            Tag
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
          <span className={labelCls}>Authors</span>
          <span
            className={cn(valueCls, 'font-serif italic')}
            data-testid={`${detailTestId}-authors`}
          >
            {c.authors}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Year</span>
          <span
            className={cn(valueCls, 'font-mono')}
            data-testid={`${detailTestId}-year`}
          >
            {c.year > 0 ? c.year : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Type</span>
          <span
            className={cn(valueCls, 'font-mono uppercase tracking-wider')}
            data-testid={`${detailTestId}-type`}
          >
            {c.type}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <span className={labelCls}>Title</span>
        <span
          className={cn(valueCls, 'font-serif')}
          data-testid={`${detailTestId}-title`}
        >
          {c.title}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span
          className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
          data-testid={`${detailTestId}-used`}
        >
          {c.useCount > 0 ? `${c.useCount}× used` : 'unused'}
        </span>
        <div className="flex items-center gap-3">
          {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
          <button
            type="button"
            onClick={onDelete}
            className="text-ink-3 hover:text-ink"
            data-testid={`${detailTestId}-delete`}
          >
            delete
          </button>
          <Button
            kind="ghost"
            size="sm"
            onClick={onEdit}
            data-testid={`${detailTestId}-edit`}
          >
            edit
          </Button>
        </div>
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

const CitationEditRow = ({
  citation: c,
  xPad,
  onCancel,
  onSaved,
  onDelete,
  onError,
}: CitationEditRowProps) => {
  const [draft, setDraft] = useState({
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
      const trimmedTitle = draft.title.trim() || '(untitled)';
      const trimmedAuthors = draft.authors.trim() || '(unknown)';
      const yearNum = (() => {
        const v = draft.year.trim();
        if (!v) return 0;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      })();

      if (trimmedKey !== c.key) {
        const existing = await db.citations
          .where('[spaceId+key]')
          .equals([c.spaceId, trimmedKey])
          .first();
        if (existing && existing.id !== c.id) {
          onError(`Tag "${trimmedKey}" is already used in this space.`);
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
        `Failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      setBusy(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  };

  // Inline-edit form uses bordered (not baseline) inputs — DS TextField currently exposes baseline/bare only.
  // Bordered variant tracked for PR 5; until then these stay raw with @lint-ignore native-input.
  const inputCls =
    'w-full rounded-sm border border-rule bg-paper px-2 py-1 text-[13px] text-ink outline-none focus:border-ink';
  const labelCls =
    'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-wider';

  const editTestId = `citation-edit-${c.id}`;
  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-3 md:py-4', xPad)}
      onKeyDown={handleKeyDown}
      data-testid={editTestId}
    >
      <div className="grid gap-3 md:grid-cols-[7rem_1fr_5rem_7rem]">
        <Label tone="ink3" weight="regular" className={labelCls}>
          Tag
          {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
          <input
            type="text"
            value={draft.key}
            onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
            className={cn(inputCls, 'font-mono')}
            autoFocus
            aria-label="Tag"
            data-testid={`${editTestId}-tag`}
          />
        </Label>
        <Label tone="ink3" weight="regular" className={labelCls}>
          Authors
          {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
          <input
            type="text"
            value={draft.authors}
            onChange={(e) =>
              setDraft((d) => ({ ...d, authors: e.target.value }))
            }
            className={inputCls}
            aria-label="Authors"
            data-testid={`${editTestId}-authors`}
          />
        </Label>
        <Label tone="ink3" weight="regular" className={labelCls}>
          Year
          {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
            className={cn(inputCls, 'font-mono')}
            aria-label="Year"
            data-testid={`${editTestId}-year`}
          />
        </Label>
        <Label tone="ink3" weight="regular" className={labelCls}>
          Type
          {/* @lint-ignore native-select: bordered inline-edit select; matching variant for DS Select tracked for PR 5 */}
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as Citation['type'],
              }))
            }
            className={inputCls}
            aria-label="Type"
            data-testid={`${editTestId}-type`}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Label>
      </div>
      <Label tone="ink3" weight="regular" className={cn(labelCls, 'mt-3')}>
        Title
        {/* @lint-ignore native-input: bordered inline-edit input; see comment above */}
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className={inputCls}
          aria-label="Title"
          data-testid={`${editTestId}-title`}
        />
      </Label>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="text-ink-3 hover:text-ink disabled:opacity-50"
          data-testid={`${editTestId}-delete`}
        >
          delete
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
            cancel
          </button>
          <Button
            kind="ghost"
            size="sm"
            onClick={handleSave}
            disabled={busy}
            data-testid={`${editTestId}-save`}
          >
            {busy ? 'saving…' : 'save'}
          </Button>
        </div>
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
  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b border-rule bg-paper-2 py-2 text-[11px] md:flex-row md:items-center md:justify-between',
        xPad,
      )}
      role="region"
      aria-label="Bulk actions"
      data-testid="citations-bulk-bar"
    >
      <span
        className="font-mono text-[10px] uppercase tracking-wider text-ink-3"
        data-testid="citations-bulk-bar-count"
      >
        {count} selected
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <Label
          tone="ink3"
          weight="regular"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"
        >
          set type
          {/* @lint-ignore native-select: bordered bulk-action select; matching variant for DS Select tracked for PR 5 */}
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as Citation['type'] | '';
              if (!v) return;
              onSetType(v);
              e.currentTarget.value = '';
            }}
            aria-label="Set type for selected citations"
            className="rounded-sm border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink outline-none focus:border-ink"
            data-testid="citations-bulk-set-type"
          >
            <option value="" disabled>
              choose…
            </option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Label>
        <Button
          kind="ghost"
          size="sm"
          onClick={onDelete}
          data-testid="citations-bulk-delete"
        >
          delete
        </Button>
        {/* @lint-ignore native-button: muted secondary text-action (text-ink-3, no underline); no matching DS Button kind */}
        <button
          type="button"
          onClick={onClear}
          className="text-ink-3 hover:text-ink"
          data-testid="citations-bulk-clear"
        >
          clear
        </button>
      </div>
    </div>
  );
};

interface ManualAddFormProps {
  spaceId: string;
  xPad: string;
  onClose: () => void;
  onStatus: (s: string | null) => void;
}

const ManualAddForm = ({ spaceId, xPad, onClose, onStatus }: ManualAddFormProps) => {
  const [raw, setRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!raw.trim()) return;
    setSubmitting(true);
    try {
      if (raw.trim().startsWith('@')) {
        const parsed = await parseBibtexText(raw, spaceId);
        const { added, skipped } = await importCitations(parsed);
        onStatus(
          `Imported ${added} citation${added === 1 ? '' : 's'}${
            skipped > 0 ? `, skipped ${skipped}` : ''
          }.`,
        );
      } else {
        const newCitation: Citation = {
          id: newId(),
          spaceId,
          key: `manual-${Date.now()}`,
          authors: '(unknown)',
          title: raw.trim(),
          year: 0,
          type: 'misc',
          useCount: 0,
        };
        await db.citations.add(newCitation);
        onStatus('Added 1 citation.');
      }
      setRaw('');
      onClose();
    } catch (err) {
      onStatus(
        `Failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn('border-b border-rule bg-paper-2 py-4', xPad)}
      data-testid="citations-manual-add"
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        Paste BibTeX or a title
      </div>
      <TextArea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={4}
        placeholder={'@article{smith2024,\n  author = {Smith, J.},\n  title  = {…},\n  year   = {2024},\n}'}
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
          cancel
        </button>
        <Button
          kind="ghost"
          size="sm"
          onClick={onSubmit}
          disabled={submitting || !raw.trim()}
          data-testid="citations-manual-add-submit"
        >
          {submitting ? 'adding…' : 'add citation'}
        </Button>
      </div>
    </div>
  );
};
