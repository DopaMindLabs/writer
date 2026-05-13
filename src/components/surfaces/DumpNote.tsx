import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Globe, X } from 'lucide-react';
import { db } from '@/db/db';
import { deleteNoteWithCascade } from '@/db/seed';
import { NoteState, type Note } from '@/db/schema';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { cn } from '@/lib/utils';

const MIN_W = 120;
const MIN_H = 60;
const MAX_W = 480;
const MAX_H = 360;

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface DumpNoteProps {
  note: Note;
  selected: boolean;
  pending: boolean;
  onPick: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

type DragState =
  | { kind: 'idle' }
  | {
      kind: 'move';
      pointerId: number;
      startX: number;
      startY: number;
      origL: number;
      origT: number;
    }
  | {
      kind: 'resize';
      pointerId: number;
      startX: number;
      startY: number;
      origW: number;
      origH: number;
    };

export function DumpNote({ note, selected, pending, onPick }: DumpNoteProps) {
  const [drag, setDrag] = useState<DragState>({ kind: 'idle' });
  const [pos, setPos] = useState({ l: note.l, t: note.t, w: note.w, h: note.h });
  const [editing, setEditing] = useState<'none' | 'title' | 'body'>('none');
  const [draftBody, setDraftBody] = useState(note.body);
  const [draftTitle, setDraftTitle] = useState(note.title ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drag.kind !== 'idle') return;
    setPos({ l: note.l, t: note.t, w: note.w, h: note.h });
  }, [note.l, note.t, note.w, note.h, drag.kind]);

  useEffect(() => {
    if (editing === 'body') setDraftBody(note.body);
  }, [note.body, editing]);

  useEffect(() => {
    if (editing === 'title') setDraftTitle(note.title ?? '');
  }, [note.title, editing]);

  const dayChip = DAY[new Date(note.createdAt).getDay()] ?? 'now';
  const isSeedPrompt = note.state === NoteState.SeedPrompt;
  const isSeedFetched = note.state === NoteState.SeedFetched;
  const isSeed = isSeedPrompt || isSeedFetched;

  const onSurfacePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (editing !== 'none') return;
      if (e.button !== 0) return;
      onPick(e);
      if (e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-resize-handle]')) return;
      if (target.closest('[data-delete]')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({
        kind: 'move',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origL: note.l,
        origT: note.t,
      });
      e.preventDefault();
    },
    [editing, onPick, note.l, note.t],
  );

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({
        kind: 'resize',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origW: note.w,
        origH: note.h,
      });
    },
    [note.w, note.h],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.kind === 'idle') return;
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.kind === 'move') {
        setPos((p) => ({
          ...p,
          l: Math.max(0, drag.origL + dx),
          t: Math.max(0, drag.origT + dy),
        }));
      } else {
        setPos((p) => ({
          ...p,
          w: Math.min(MAX_W, Math.max(MIN_W, drag.origW + dx)),
          h: Math.min(MAX_H, Math.max(MIN_H, drag.origH + dy)),
        }));
      }
    },
    [drag],
  );

  const onPointerUp = useCallback(
    async (e: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.kind === 'idle') return;
      if (e.pointerId !== drag.pointerId) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (drag.kind === 'move') {
        await db.notes.update(note.id, { l: pos.l, t: pos.t });
      } else {
        await db.notes.update(note.id, { w: pos.w, h: pos.h });
      }
      setDrag({ kind: 'idle' });
    },
    [drag, note.id, pos.l, pos.t, pos.w, pos.h],
  );

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteNoteWithCascade(note.id);
  }

  async function maybePromote() {
    if (note.state !== NoteState.User) {
      await db.notes.update(note.id, { state: NoteState.User });
    }
  }

  async function commitBody() {
    setEditing('none');
    if (draftBody !== note.body) {
      await db.notes.update(note.id, { body: draftBody });
      await maybePromote();
    }
  }

  async function commitTitle() {
    setEditing('none');
    const next = draftTitle.trim() || undefined;
    if (next !== note.title) {
      await db.notes.update(note.id, { title: next });
      await maybePromote();
    }
  }

  return (
    <div
      ref={ref}
      onPointerDown={onSurfacePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        left: pos.l,
        top: pos.t,
        width: pos.w,
        minHeight: pos.h,
      }}
      className={cn(
        'group absolute flex flex-col gap-1 border bg-paper p-2.5',
        selected || !isSeed ? 'border-ink' : 'border-rule',
        pending && 'outline-2 outline-dashed outline-ink-3 outline-offset-2',
        drag.kind === 'idle' ? 'cursor-grab' : 'cursor-grabbing',
        selected && 'outline outline-2 outline-ink outline-offset-2',
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">
        <span>{NOTE_KIND_LABEL[note.kind]}</span>
        <span className="flex-1" />
        {isSeedFetched && (
          <Globe className="h-3 w-3 text-ink-4" aria-label="Fetched content" />
        )}
        <span>{dayChip}</span>
        <button
          type="button"
          onClick={onDelete}
          data-delete
          aria-label="Delete note"
          className={cn(
            'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm text-ink-4 transition-opacity hover:bg-paper-2 hover:text-ink',
            isSeedPrompt
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {editing === 'title' ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraftTitle(note.title ?? '');
              setEditing('none');
            }
          }}
          placeholder="title"
          className="border-0 bg-transparent p-0 font-serif text-[13px] font-medium text-ink outline-none"
        />
      ) : note.title ? (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onClick={() => setEditing('title')}
          className="font-serif text-[13px] font-medium text-ink"
        >
          {note.title}
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setEditing('title')}
          className="self-start font-mono text-[9px] uppercase tracking-wider text-ink-4 opacity-0 hover:text-ink-2 group-hover:opacity-100"
        >
          + title
        </button>
      )}

      {editing === 'body' ? (
        <textarea
          autoFocus
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          onBlur={commitBody}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraftBody(note.body);
              setEditing('none');
            }
          }}
          className={cn(
            'flex-1 resize-none border-0 bg-transparent p-0 font-serif text-[12px] leading-snug text-ink-2 outline-none',
            isSeedPrompt && 'italic',
          )}
        />
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setEditing('body')}
          className={cn(
            'flex-1 cursor-text whitespace-pre-wrap font-serif text-[12px] leading-snug text-ink-2',
            isSeedPrompt && 'italic',
            !note.body && !isSeedPrompt && 'text-ink-4',
          )}
        >
          {note.body || (isSeedPrompt ? '' : '(click to write)')}
        </div>
      )}

      <div
        data-resize-handle
        onPointerDown={onResizePointerDown}
        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
        aria-label="Resize note"
      />
    </div>
  );
}
