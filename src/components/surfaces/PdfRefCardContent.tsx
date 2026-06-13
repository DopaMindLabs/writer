import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Pencil, RefreshCw } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import { NoteState, type Note } from '@/db/schema';
import { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import {
  fetchAndCachePdf,
  filenameFromUrl,
  invalidateUrlCache,
  type FetchFailureReason,
} from '@/lib/pdf-url-cache';
import { IconButton } from '@/components/ui/icon';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { TextField } from '@/components/ui/TextField';
import { TextArea } from '@/components/ui/TextArea';
import { PdfViewer } from '@/components/ui/PdfViewer';
import { cn } from '@/lib/utils';

interface PdfRefCardContentProps {
  note: Note;
}

const URL_PLACEHOLDER = 'https://arxiv.org/pdf/…';
const URL_HINT = 'paste an https:// PDF URL';

type FetchStatus =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'error'; reason: FetchFailureReason; message: string };

const useFetchPdf = (noteId: string) => {
  const [status, setStatus] = useState<FetchStatus>({ kind: 'idle' });
  const run = async (url: string) => {
    setStatus({ kind: 'fetching' });
    const result = await fetchAndCachePdf(noteId, url);
    if (result.ok) {
      setStatus({ kind: 'idle' });
    } else {
      setStatus({ kind: 'error', reason: result.reason, message: result.message });
    }
  };
  return { status, run, reset: () => { setStatus({ kind: 'idle' }); } };
};

interface UrlInputProps {
  initialValue: string;
  busy: boolean;
  onSubmit: (next: string) => void;
  onCancel?: () => void;
  testIdPrefix: string;
}

interface UrlInputRowProps {
  inputId: string;
  hintId: string;
  value: string;
  setValue: (v: string) => void;
  busy: boolean;
  onCancel?: () => void;
  testIdPrefix: string;
}

const UrlInputRow = ({
  inputId,
  hintId,
  value,
  setValue,
  busy,
  onCancel,
  testIdPrefix,
}: UrlInputRowProps) => (
  <div className="flex items-center gap-1">
    <TextField
      id={inputId}
      aria-describedby={hintId}
      value={value}
      onChange={(e) => { setValue(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
      disabled={busy}
      placeholder={URL_PLACEHOLDER}
      data-testid={`${testIdPrefix}-field`}
      className="font-sans text-[12px]"
    />
    <button
      type="submit"
      disabled={busy || value.trim().length === 0}
      data-testid={`${testIdPrefix}-submit`}
      className="border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:text-ink-4"
    >
      {busy ? 'fetching' : 'fetch'}
    </button>
  </div>
);

const UrlInput = ({
  initialValue,
  busy,
  onSubmit,
  onCancel,
  testIdPrefix,
}: UrlInputProps) => {
  const [value, setValue] = useState(initialValue);
  const inputId = `${testIdPrefix}-input`;
  const hintId = `${testIdPrefix}-hint`;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()); }}
      onPointerDown={(e) => { e.stopPropagation(); }}
      data-no-drag
      className="flex flex-col gap-1"
    >
      <label
        htmlFor={inputId}
        className="font-mono text-[9px] uppercase tracking-wider text-ink-3"
      >
        PDF URL
      </label>
      <UrlInputRow
        inputId={inputId}
        hintId={hintId}
        value={value}
        setValue={setValue}
        busy={busy}
        onCancel={onCancel}
        testIdPrefix={testIdPrefix}
      />
      <span id={hintId} className="font-sans text-[11px] text-ink-4">
        {URL_HINT}
      </span>
    </form>
  );
};

interface CommentaryProps {
  note: Note;
}

const useCommentaryEditing = (note: Note) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  useEffect(() => {
    if (!editing) setDraft(note.body);
  }, [note.body, editing]);

  const commit = async () => {
    setEditing(false);
    if (draft !== note.body) {
      await db.notes.update(note.id, { body: draft });
      if (note.state !== NoteState.User) {
        await db.notes.update(note.id, { state: NoteState.User });
      }
    }
  };

  const cancel = () => {
    setDraft(note.body);
    setEditing(false);
  };

  return { editing, setEditing, draft, setDraft, commit, cancel };
};

const Commentary = ({ note }: CommentaryProps) => {
  const { t } = useTranslation('screens');
  const ed = useCommentaryEditing(note);
  if (ed.editing) {
    return (
      <TextArea
        variant="bare"
        autoFocus
        rows={undefined}
        value={ed.draft}
        onChange={(e) => { ed.setDraft(e.target.value); }}
        onBlur={() => { void ed.commit(); }}
        onKeyDown={(e) => { if (e.key === 'Escape') ed.cancel(); }}
        data-no-drag
        data-testid={`brain-note-${note.id}-body-input`}
        className="min-h-[28px] resize-none font-serif text-[12px] leading-snug text-ink-2"
      />
    );
  }
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={() => { ed.setEditing(true); }}
      data-no-drag
      data-testid={`brain-note-${note.id}-body`}
      className={cn(
        'cursor-text whitespace-pre-wrap font-serif text-[12px] leading-snug text-ink-2',
        !note.body && 'text-ink-4',
      )}
    >
      {note.body || t('brainSpace.note.bodyEmpty')}
    </div>
  );
};

interface ReadyCardProps {
  note: Note;
  cacheBlob: Blob;
  pageCount: number;
  url: string;
  busy: boolean;
  onRefresh: () => void;
  onEditUrl: () => void;
  onOpenBeside: () => void;
}

const ReadyHeader = ({
  noteId,
  name,
  pageCount,
}: {
  noteId: string;
  name: string;
  pageCount: number;
}) => (
  <div
    className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3"
    data-testid={`brain-note-${noteId}-pdf-meta`}
  >
    <span className="truncate" title={name}>{name}</span>
    <span aria-hidden>·</span>
    <span>{`${String(pageCount)} pages`}</span>
  </div>
);

const ReadyActions = ({
  noteId,
  busy,
  onOpenBeside,
  onEditUrl,
  onRefresh,
}: {
  noteId: string;
  busy: boolean;
  onOpenBeside: () => void;
  onEditUrl: () => void;
  onRefresh: () => void;
}) => (
  <div
    className="flex items-center gap-1"
    data-no-drag
    onPointerDown={(e) => { e.stopPropagation(); }}
  >
    <button
      type="button"
      onClick={onOpenBeside}
      data-testid={`brain-note-${noteId}-open-beside`}
      className="inline-flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:border-ink hover:text-ink"
    >
      <ArrowUpRight className="h-3 w-3" aria-hidden />
      open beside editor
    </button>
    <IconButton
      icon={Pencil}
      iconSize="xs"
      label="Edit URL"
      onClick={onEditUrl}
      data-testid={`brain-note-${noteId}-edit-url`}
    />
    <IconButton
      icon={RefreshCw}
      iconSize="xs"
      label="Refresh PDF"
      onClick={onRefresh}
      disabled={busy}
      data-testid={`brain-note-${noteId}-refresh`}
    />
  </div>
);

const ReadyCard = ({
  note,
  cacheBlob,
  pageCount,
  url,
  busy,
  onRefresh,
  onEditUrl,
  onOpenBeside,
}: ReadyCardProps) => {
  const name = filenameFromUrl(url);
  return (
    <>
      <ReadyHeader noteId={note.id} name={name} pageCount={pageCount} />
      <div
        data-no-drag
        onPointerDown={(e) => { e.stopPropagation(); }}
        data-testid={`brain-note-${note.id}-pdf-thumb`}
        className="border border-rule bg-paper-2"
      >
        <PdfViewer
          blob={cacheBlob}
          name={name}
          mode="thumbnail"
          pageCount={pageCount}
        />
      </div>
      <Commentary note={note} />
      <ReadyActions
        noteId={note.id}
        busy={busy}
        onOpenBeside={onOpenBeside}
        onEditUrl={onEditUrl}
        onRefresh={onRefresh}
      />
    </>
  );
};

interface ErrorViewProps {
  note: Note;
  url: string;
  message: string;
  busy: boolean;
  onResubmit: (next: string) => void;
}

const ErrorView = ({ note, url, message, busy, onResubmit }: ErrorViewProps) => (
  <>
    <InlineBanner
      kind="error"
      title="Couldn't fetch this PDF"
      data-testid={`brain-note-${note.id}-pdf-error`}
    >
      {message}
    </InlineBanner>
    <UrlInput
      initialValue={url}
      busy={busy}
      onSubmit={onResubmit}
      testIdPrefix={`brain-note-${note.id}-pdf-url-retry`}
    />
  </>
);

interface FetchingViewProps {
  noteId: string;
}

const FetchingView = ({ noteId }: FetchingViewProps) => (
  <div
    role="status"
    aria-live="polite"
    data-testid={`brain-note-${noteId}-pdf-loading`}
    className="flex items-center gap-2 border border-dashed border-rule bg-paper-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-3"
  >
    fetching PDF…
  </div>
);

const useAutoFetchOnUrlChange = (
  note: Note,
  cache: ReturnType<typeof useNoteUrlCache>,
  fetcher: ReturnType<typeof useFetchPdf>,
) => {
  const lastTriedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!note.pdfUrl) return;
    if (cache?.url === note.pdfUrl) return;
    if (fetcher.status.kind !== 'idle') return;
    if (lastTriedRef.current === note.pdfUrl) return;
    lastTriedRef.current = note.pdfUrl;
    void fetcher.run(note.pdfUrl);
  }, [note.pdfUrl, cache, fetcher]);
};

interface CardController {
  fetcher: ReturnType<typeof useFetchPdf>;
  editingUrl: boolean;
  setEditingUrl: (v: boolean) => void;
  submitUrl: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
  openBeside: () => void;
}

const useCardController = (note: Note): CardController => {
  const openPane = useUI((s) => s.openMediaReadingPaneForNote);
  const fetcher = useFetchPdf(note.id);
  const [editingUrl, setEditingUrl] = useState(false);

  const submitUrl = async (url: string) => {
    if (url.length === 0) return;
    await invalidateUrlCache(note.id);
    if (note.pdfUrl !== url) {
      await db.notes.update(note.id, { pdfUrl: url });
    }
    setEditingUrl(false);
    await fetcher.run(url);
  };

  const refresh = async () => {
    if (!note.pdfUrl) return;
    await invalidateUrlCache(note.id);
    await fetcher.run(note.pdfUrl);
  };

  const openBeside = () => { openPane(note.id); };

  return {
    fetcher,
    editingUrl,
    setEditingUrl,
    submitUrl,
    refresh,
    openBeside,
  };
};

export const PdfRefCardContent = ({ note }: PdfRefCardContentProps) => {
  const cache = useNoteUrlCache(note.id);
  const ctrl = useCardController(note);
  useAutoFetchOnUrlChange(note, cache, ctrl.fetcher);

  if (!note.pdfUrl || ctrl.editingUrl) {
    return (
      <UrlInput
        initialValue={note.pdfUrl ?? ''}
        busy={ctrl.fetcher.status.kind === 'fetching'}
        onSubmit={(next) => { void ctrl.submitUrl(next); }}
        onCancel={ctrl.editingUrl ? () => { ctrl.setEditingUrl(false); } : undefined}
        testIdPrefix={`brain-note-${note.id}-pdf-url`}
      />
    );
  }
  if (ctrl.fetcher.status.kind === 'fetching') {
    return <FetchingView noteId={note.id} />;
  }
  if (ctrl.fetcher.status.kind === 'error') {
    return (
      <ErrorView
        note={note}
        url={note.pdfUrl}
        message={ctrl.fetcher.status.message}
        busy={false}
        onResubmit={(next) => { void ctrl.submitUrl(next); }}
      />
    );
  }
  if (cache) {
    return (
      <ReadyCard
        note={note}
        cacheBlob={cache.blob}
        pageCount={cache.pageCount}
        url={cache.url}
        busy={false}
        onRefresh={() => { void ctrl.refresh(); }}
        onEditUrl={() => { ctrl.setEditingUrl(true); }}
        onOpenBeside={ctrl.openBeside}
      />
    );
  }
  return <FetchingView noteId={note.id} />;
};
