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
import { DumpNote } from './DumpNote';
import { DumpConnection } from './DumpConnection';
import type { Note } from '@/db/schema';

interface DumpCanvasProps {
  worldId: string;
}

const TOOLBAR: { label: string; kind: Note['kind'] }[] = [
  { label: '+ thought', kind: 'note' },
  { label: '+ person', kind: 'char' },
  { label: '+ place', kind: 'place' },
  { label: '+ lore', kind: 'lore' },
];

const DEFAULT_W = 184;
const DEFAULT_H = 80;

export function DumpCanvas({ worldId }: DumpCanvasProps) {
  const notes = useNotes(worldId);
  const connections = useConnections(worldId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);

  const notesById = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(n.id, n);
    return m;
  }, [notes]);

  const addNote = useCallback(
    async (kind: Note['kind']) => {
      const existingCount = notes.length;
      const jitter = (existingCount * 24) % 240;
      await db.notes.add({
        id: newId(),
        worldId,
        l: 24 + jitter,
        t: 24 + jitter,
        w: DEFAULT_W,
        h: DEFAULT_H,
        kind,
        body: '',
        createdAt: Date.now(),
      });
    },
    [worldId, notes.length],
  );

  const handlePick = useCallback(
    async (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.shiftKey) {
        if (pendingFrom === null) {
          setPendingFrom(id);
        } else if (pendingFrom !== id) {
          await db.connections.add({
            id: newId(),
            worldId,
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
      setSelectedId(id);
    },
    [pendingFrom, worldId],
  );

  function onBackgroundPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    setSelectedId(null);
    setPendingFrom(null);
  }

  return (
    <div
      onPointerDown={onBackgroundPointerDown}
      className="relative h-full w-full overflow-hidden bg-paper"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, var(--rule) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
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
              <DumpConnection key={c.id} connection={c} from={from} to={to} />
            );
          })}
        </g>
      </svg>

      {notes.map((n) => (
        <DumpNote
          key={n.id}
          note={n}
          selected={selectedId === n.id}
          pending={pendingFrom === n.id}
          onPick={(e) => handlePick(n.id, e)}
        />
      ))}

      {notes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
          <div>
            <p className="font-serif text-[20px] italic text-ink-3">
              start dumping
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-4">
              pick a card type below
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 border border-ink bg-paper">
        {TOOLBAR.map((t, i) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => addNote(t.kind)}
            className={
              'inline-block px-3 py-1.5 font-sans text-[11px] text-ink-3 hover:text-ink' +
              (i < TOOLBAR.length - 1 ? ' border-r border-rule' : '')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {pendingFrom && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-ink bg-paper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink">
          shift-click another note to connect · esc to cancel
        </div>
      )}
    </div>
  );
}
