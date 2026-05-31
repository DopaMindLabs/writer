import {
  useCallback,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { useNotes } from '@/hooks/useNotes';
import { useConnections } from '@/hooks/useConnections';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { getTemplate } from '@/data/templates';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { BrainSpaceNote } from './BrainSpaceNote';
import { BrainSpaceConnection } from './BrainSpaceConnection';
import { BrainSpaceDetailDrawer } from './BrainSpaceDetailDrawer';
import { NoteKind, NoteState, type Note, type Connection } from '@/db/schema';
import { TypographyLabel, TypographyP } from '@/components/ui/typography';

interface BrainSpaceCanvasProps {
  spaceId: string;
}

const DEFAULT_W = 184;
const DEFAULT_H = 80;

interface ConnectionsLayerProps {
  connections: Connection[];
  notesById: Map<string, Note>;
}

const ConnectionsLayer = ({ connections, notesById }: ConnectionsLayerProps) => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full"
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

const CanvasEmptyState = () => (
  <div
    data-testid="brain-canvas-empty"
    className="pointer-events-none absolute inset-0 flex items-center justify-center text-center"
  >
    <div>
      <TypographyP variant="emptyHint">start dumping</TypographyP>
      <TypographyLabel variant="wide" className="mt-1 text-ink-4">
        pick a card type below
      </TypographyLabel>
    </div>
  </div>
);

const CanvasPendingHint = () => (
  <div
    data-testid="brain-canvas-pending-hint"
    className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-ink bg-paper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink"
  >
    shift-click another note to connect · esc to cancel
  </div>
);

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
      // @lint-ignore native-button: segmented toolbar with vertical dividers; DS Button ghost variant has incompatible padding + bottom-border
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

const useCanvasInteractions = (spaceId: string, noteCount: number) => {
  const focusNote = useUI((s) => s.focusNote);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const addNote = useCallback(
    async (kind: NoteKind) => {
      const jitter = (noteCount * 24) % 240;
      await db.notes.add({
        id: newId(),
        spaceId,
        l: 24 + jitter,
        t: 24 + jitter,
        w: DEFAULT_W,
        h: DEFAULT_H,
        kind,
        state: NoteState.User,
        body: '',
        createdAt: Date.now(),
      });
    },
    [spaceId, noteCount],
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
    if (e.target !== e.currentTarget) return;
    focusNote(null);
    setPendingFrom(null);
  };

  return { pendingFrom, addNote, handlePick, onBackgroundPointerDown };
};

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

  const { pendingFrom, addNote, handlePick, onBackgroundPointerDown } =
    useCanvasInteractions(spaceId, notes.length);

  return (
    <div
      data-tour="tour-brainspace-canvas"
      data-testid="brain-canvas"
      onPointerDown={onBackgroundPointerDown}
      className="relative h-full min-w-0 flex-1 overflow-hidden bg-paper"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, var(--rule) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <ConnectionsLayer connections={connections} notesById={notesById} />

      {notes.map((n) => (
        <BrainSpaceNote
          key={n.id}
          note={n}
          spaceId={spaceId}
          selected={focusedNoteId === n.id}
          pending={pendingFrom === n.id}
          onPick={(e) => { void handlePick(n.id, e); }}
        />
      ))}

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
