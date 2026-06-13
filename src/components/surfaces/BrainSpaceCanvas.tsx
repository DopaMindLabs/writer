import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { useNotes } from '@/hooks/useNotes';
import {
  useNoteAttachmentsBySpace,
  attachmentsForNote,
} from '@/hooks/useNoteAttachments';
import { useConnections } from '@/hooks/useConnections';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { getTemplate } from '@/data/templates';
import { getNoteType } from '@/data/note-types';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { BrainSpaceNote } from './BrainSpaceNote';
import { BrainSpaceConnection } from './BrainSpaceConnection';
import { BrainSpaceDetailDrawer } from './BrainSpaceDetailDrawer';
import {
  NoteKind,
  NoteLayout,
  NoteState,
  type Note,
  type Connection,
  type NoteAttachment,
} from '@/db/schema';
import { TypographyLabel, TypographyP } from '@/components/ui/typography';

interface BrainSpaceCanvasProps {
  spaceId: string;
}

const DEFAULT_W = 184;
const DEFAULT_H = 80;
const IMAGE_DEFAULT_W = 240;
const IMAGE_DEFAULT_H = 200;
const PDF_REF_DEFAULT_W = 240;
const PDF_REF_DEFAULT_H = 220;
const CONTENT_MARGIN = 200;

interface ContentExtent {
  width: number;
  height: number;
}

const contentExtent = (notes: Note[]): ContentExtent => {
  let width = 0;
  let height = 0;
  for (const n of notes) {
    width = Math.max(width, n.l + n.w);
    height = Math.max(height, n.t + n.h);
  }
  return {
    width: width + CONTENT_MARGIN,
    height: height + CONTENT_MARGIN,
  };
};

interface ConnectionsLayerProps {
  connections: Connection[];
  notesById: Map<string, Note>;
  extent: ContentExtent;
}

const ConnectionsLayer = ({
  connections,
  notesById,
  extent,
}: ConnectionsLayerProps) => (
  <svg
    className="pointer-events-none absolute left-0 top-0"
    width={extent.width}
    height={extent.height}
    style={{ pointerEvents: 'none' }}
  >
    <g style={{ pointerEvents: 'auto' }}>
      {connections.map((c) => {
        const from = notesById.get(c.fromNoteId);
        const to = notesById.get(c.toNoteId);
        if (!from || !to) return null;
        return (
          <BrainSpaceConnection key={c.id} connection={c} from={from} to={to} />
        );
      })}
    </g>
  </svg>
);

const CanvasEmptyState = () => {
  const { t } = useTranslation('screens');
  return (
    <div
      data-testid="brain-canvas-empty"
      className="pointer-events-none absolute inset-0 flex items-center justify-center text-center"
    >
      <div>
        <TypographyP variant="emptyHint">
          {t('brainSpace.canvas.emptyTitle')}
        </TypographyP>
        <TypographyLabel variant="wide" className="mt-1 text-ink-4">
          {t('brainSpace.canvas.emptyHint')}
        </TypographyLabel>
      </div>
    </div>
  );
};

const CanvasPendingHint = () => {
  const { t } = useTranslation('screens');
  return (
    <div
      data-testid="brain-canvas-pending-hint"
      className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-ink bg-paper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink"
    >
      {t('brainSpace.canvas.pendingHint')}
    </div>
  );
};

interface CanvasToolbarProps {
  toolbarKinds: NoteKind[];
  onAddNote: (kind: NoteKind) => void;
}

const CanvasToolbar = ({ toolbarKinds, onAddNote }: CanvasToolbarProps) => (
  <div
    data-tour="tour-brainspace-add-note"
    data-testid="brain-canvas-toolbar"
    className="absolute bottom-5 left-1/2 -translate-x-1/2 border border-ink bg-paper"
  >
    {toolbarKinds.map((kind, i) => (
      <button
        key={kind}
        data-testid={`brain-canvas-tool-${kind}`}
        type="button"
        onClick={() => { onAddNote(kind); }}
        className={
          'inline-block px-3 py-1.5 font-sans text-[11px] text-ink-3 hover:text-ink' +
          (i < toolbarKinds.length - 1 ? ' border-r border-rule' : '')
        }
      >
        + {NOTE_KIND_LABEL[kind]}
      </button>
    ))}
  </div>
);

const viewportOrigin = (scroller: HTMLDivElement | null) => ({
  l: scroller ? Math.round(scroller.scrollLeft) : 0,
  t: scroller ? Math.round(scroller.scrollTop) : 0,
});

const sizeForLayout = (layout: NoteLayout): { w: number; h: number } => {
  switch (layout) {
    case NoteLayout.Image:
      return { w: IMAGE_DEFAULT_W, h: IMAGE_DEFAULT_H };
    case NoteLayout.PdfRef:
      return { w: PDF_REF_DEFAULT_W, h: PDF_REF_DEFAULT_H };
    case NoteLayout.Text:
    default:
      return { w: DEFAULT_W, h: DEFAULT_H };
  }
};

const buildNote = (
  spaceId: string,
  kind: NoteKind,
  noteCount: number,
  origin: { l: number; t: number },
): Note => {
  const jitter = (noteCount * 24) % 240;
  const type = getNoteType(kind);
  const { w, h } = sizeForLayout(type.layout);
  return {
    id: newId(),
    spaceId,
    l: origin.l + 24 + jitter,
    t: origin.t + 24 + jitter,
    w,
    h,
    kind,
    state: NoteState.User,
    body: '',
    createdAt: Date.now(),
    typeVersion: type.version,
  };
};

const useCanvasInteractions = (
  spaceId: string,
  noteCount: number,
  scrollRef: RefObject<HTMLDivElement | null>,
) => {
  const focusNote = useUI((s) => s.focusNote);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const addNote = useCallback(
    async (kind: NoteKind) => {
      const note = buildNote(
        spaceId,
        kind,
        noteCount,
        viewportOrigin(scrollRef.current),
      );
      await db.notes.add(note);
      focusNote(note.id);
    },
    [spaceId, noteCount, focusNote, scrollRef],
  );

  const handlePick = useCallback(
    async (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.shiftKey) {
        if (pendingFrom === null) {
          setPendingFrom(id);
        } else if (pendingFrom !== id) {
          await db.connections.add({
            id: newId(),
            spaceId,
            fromNoteId: pendingFrom,
            toNoteId: id,
            createdAt: Date.now(),
          });
          setPendingFrom(null);
        } else {
          setPendingFrom(null);
        }
        return;
      }
      focusNote(id);
    },
    [pendingFrom, spaceId, focusNote],
  );

  const onBackgroundPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-testid^="brain-note-"]')) return;
    focusNote(null);
    setPendingFrom(null);
  };

  return { pendingFrom, addNote, handlePick, onBackgroundPointerDown };
};

interface CanvasScrollProps {
  spaceId: string;
  notes: Note[];
  connections: Connection[];
  notesById: Map<string, Note>;
  attachmentsByNote: Map<string, NoteAttachment[]>;
  focusedNoteId: string | null;
  pendingFrom: string | null;
  extent: ContentExtent;
  scrollRef: RefObject<HTMLDivElement | null>;
  onPick: (id: string, e: ReactPointerEvent<HTMLDivElement>) => void;
}

const CanvasScroll = ({
  spaceId,
  notes,
  connections,
  notesById,
  attachmentsByNote,
  focusedNoteId,
  pendingFrom,
  extent,
  scrollRef,
  onPick,
}: CanvasScrollProps) => (
  <div
    ref={scrollRef}
    data-testid="brain-canvas-scroll"
    className="absolute inset-0 overflow-auto"
  >
    <div
      data-testid="brain-canvas-content"
      className="relative min-h-full min-w-full"
      style={{
        width: extent.width,
        height: extent.height,
        backgroundImage:
          'radial-gradient(circle at 1px 1px, var(--rule) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <ConnectionsLayer
        connections={connections}
        notesById={notesById}
        extent={extent}
      />

      {notes.map((n) => (
        <BrainSpaceNote
          key={n.id}
          note={n}
          spaceId={spaceId}
          selected={focusedNoteId === n.id}
          pending={pendingFrom === n.id}
          attachments={attachmentsForNote(attachmentsByNote, n.id)}
          onPick={(e) => { onPick(n.id, e); }}
        />
      ))}
    </div>
  </div>
);

export const BrainSpaceCanvas = ({ spaceId }: BrainSpaceCanvasProps) => {
  const notes = useNotes(spaceId);
  const connections = useConnections(spaceId);
  const space = useSpace(spaceId);
  const focusedNoteId = useUI((s) => s.focusedNoteId);

  const toolbarKinds = useMemo<NoteKind[]>(() => {
    const tpl = space?.template ? getTemplate(space.template) : undefined;
    const kinds = tpl?.noteKinds;
    return kinds && kinds.length > 0 ? kinds : [NoteKind.Blank];
  }, [space?.template]);

  const notesById = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(n.id, n);
    return m;
  }, [notes]);

  const attachmentsByNote = useNoteAttachmentsBySpace(spaceId);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { pendingFrom, addNote, handlePick, onBackgroundPointerDown } =
    useCanvasInteractions(spaceId, notes.length, scrollRef);

  const extent = useMemo(() => contentExtent(notes), [notes]);

  return (
    <div
      data-tour="tour-brainspace-canvas"
      data-testid="brain-canvas"
      onPointerDown={onBackgroundPointerDown}
      className="relative h-full min-w-0 flex-1 overflow-hidden bg-paper"
    >
      <CanvasScroll
        spaceId={spaceId}
        notes={notes}
        connections={connections}
        notesById={notesById}
        attachmentsByNote={attachmentsByNote}
        focusedNoteId={focusedNoteId}
        pendingFrom={pendingFrom}
        extent={extent}
        scrollRef={scrollRef}
        onPick={(id, e) => { void handlePick(id, e); }}
      />

      {notes.length === 0 && <CanvasEmptyState />}

      <CanvasToolbar
        toolbarKinds={toolbarKinds}
        onAddNote={(kind) => { void addNote(kind); }}
      />

      {pendingFrom && <CanvasPendingHint />}

      <BrainSpaceDetailDrawer spaceId={spaceId} />
    </div>
  );
};
