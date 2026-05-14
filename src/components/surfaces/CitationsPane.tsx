import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
} from 'react';
import { Search } from 'lucide-react';
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
import type { Citation } from '@/db/schema';

export type CitationsDensity = 'comfortable' | 'compact';

interface CitationsPaneProps {
  spaceId: string;
  spaceName?: string;
  density?: CitationsDensity;
}

const PAGE_SIZE = 25;

const COL_TEMPLATE_COMFORTABLE =
  'md:grid md:grid-cols-[7rem_minmax(8rem,12rem)_minmax(0,1fr)_4rem_6rem_4rem]';
const COL_TEMPLATE_COMPACT =
  'md:grid md:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_4rem]';

export function CitationsPane({
  spaceId,
  spaceName,
  density = 'comfortable',
}: CitationsPaneProps) {
  const citations = useCitations(spaceId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setPage(0);
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

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
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
  }

  function handleExport() {
    const bib = serializeCitationsToBibtex(citations);
    const blob = new Blob([bib], { type: 'application/x-bibtex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spaceName ?? 'space'}-citations.bib`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-paper">
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
        <div className="relative flex w-full max-w-full items-center md:w-[360px] md:max-w-[40%]">
          <Search className="absolute left-0 h-3 w-3 text-ink-4" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="authors, tags, year…"
            className="w-full border-0 border-b border-rule bg-transparent py-1.5 pl-5 text-[12px] text-ink outline-none placeholder:text-ink-4 focus:border-ink"
          />
        </div>
        <div className="flex items-center gap-5 text-[11px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-ink underline underline-offset-4 hover:text-ink-2"
          >
            ↑ upload .bib / .ris
          </button>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-ink-3 hover:text-ink"
          >
            {adding ? '× cancel' : '+ add'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bib,.bibtex,text/x-bibtex,application/x-bibtex"
            className="hidden"
            onChange={handleFile}
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
        >
          {status}
        </div>
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
          pageRows.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex flex-col gap-1 border-b border-rule py-3 hover:bg-paper-2 md:items-baseline md:gap-4 md:py-2.5',
                colTemplate,
                xPad,
              )}
            >
              {!isCompact && (
                <span className="hidden truncate font-mono text-[11px] text-ink md:inline">
                  {c.key}
                </span>
              )}
              <span className="font-serif text-[16px] text-ink md:hidden">
                {c.title}
              </span>
              <span className="truncate font-serif text-[14px] italic text-ink">
                {c.authors}
              </span>
              <span className="hidden truncate font-serif text-[14px] text-ink-2 md:inline">
                {c.title}
              </span>
              <span className="hidden font-mono text-[11px] text-ink-3 md:inline">
                {c.year > 0 ? c.year : '—'}
              </span>
              {!isCompact && (
                <span className="hidden font-mono text-[9px] uppercase tracking-wider text-ink-3 md:inline">
                  {c.type}
                </span>
              )}
              {!isCompact && (
                <span className="hidden text-right font-mono text-[11px] text-ink md:inline">
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
          ))
        )}
      </div>

      <div
        className={cn(
          'flex flex-col gap-2 border-t border-rule py-3 font-mono text-[10px] uppercase tracking-wider text-ink-3 md:flex-row md:items-center md:justify-between',
          xPad,
        )}
      >
        <span>STYLE — CHICAGO (AUTHOR-DATE)</span>
        <button
          type="button"
          onClick={handleExport}
          disabled={citations.length === 0}
          className="text-ink underline underline-offset-4 hover:text-ink-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          EXPORT AS .BIB
        </button>
        <div className="flex items-center gap-3">
          <span>
            {filtered.length} SHOWN · {pageRows.length} ON THIS PAGE
          </span>
          {totalPages > 1 && (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous page"
              >
                ‹
              </button>
              <span>
                {currentPage + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next page"
              >
                ›
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasCitations }: { hasCitations: boolean }) {
  return (
    <div className="flex items-center justify-center px-4 py-20 md:px-10">
      <div className="text-center">
        <p className="font-serif text-[20px] text-ink">no citations yet</p>
        <p className="mt-2 text-[13px] text-ink-3">
          {hasCitations
            ? 'no rows match your search.'
            : 'import a .bib or add one manually.'}
        </p>
      </div>
    </div>
  );
}

interface ManualAddFormProps {
  spaceId: string;
  xPad: string;
  onClose: () => void;
  onStatus: (s: string | null) => void;
}

function ManualAddForm({ spaceId, xPad, onClose, onStatus }: ManualAddFormProps) {
  const [raw, setRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
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
  }

  return (
    <div className={cn('border-b border-rule bg-paper-2 py-4', xPad)}>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        Paste BibTeX or a title
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={4}
        placeholder={'@article{smith2024,\n  author = {Smith, J.},\n  title  = {…},\n  year   = {2024},\n}'}
        className="w-full resize-y rounded-sm border border-rule bg-paper p-2 font-mono text-[12px] text-ink outline-none focus:border-ink"
      />
      <div className="mt-2 flex items-center justify-end gap-3 text-[11px]">
        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !raw.trim()}
          className="text-ink underline underline-offset-4 hover:text-ink-2 disabled:opacity-50"
        >
          {submitting ? 'adding…' : 'add citation'}
        </button>
      </div>
    </div>
  );
}
