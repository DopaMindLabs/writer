import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ExternalLink,
  Globe,
  ImagePlus,
  Trash2,
} from '@/components/libs/icons';
import { db } from '@/db/db';
import { deleteNoteWithCascade } from '@/db/seed';
import { useUI } from '@/store/ui';
import { NoteState, type Note, type NoteAttachment } from '@/db/schema';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { IMAGE_ACCEPT_ATTR, MAX_NOTE_IMAGES } from '@/data/note-attachments';
import { addNoteImages, deleteNoteAttachment } from '@/lib/note-attachments';
import { useNoteAttachments } from '@/hooks/useNoteAttachments';
import { routes } from '@/lib/routes';
import { IconButton } from '@/components/ui/icon';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { TextField } from '@/components/ui/TextField';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';

const MIN_W = 120;
const MIN_H = 60;
const MAX_W = 480;
const MAX_H = 360;

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface BrainSpaceNoteProps {
  note: Note;
  spaceId: string;
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

interface NoteContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

const NoteContextMenu = ({ x, y, onDelete, onClose }: NoteContextMenuProps) => {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-context-menu]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      data-note-context-menu
      data-testid="brain-note-context-menu"
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[10rem] border border-ink bg-paper py-1 shadow-md"
    >
      {/* @lint-ignore native-button: menuitem in a context menu; danger-tinted row not a DS Button kind */}
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        data-testid="brain-note-context-menu-delete"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[12px] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-bg)]"
      >
        <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />
        Delete note
      </button>
    </div>,
    document.body,
  );
};

const capturePointer = (el: HTMLElement, pointerId: number) => {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    /* environments without pointer capture (jsdom) */
  }
};

const releasePointer = (el: HTMLElement, pointerId: number) => {
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    /* ignore */
  }
};

interface NotePos {
  l: number;
  t: number;
  w: number;
  h: number;
}

const applyDragDelta = (
  p: NotePos,
  drag: Extract<DragState, { kind: 'move' | 'resize' }>,
  dx: number,
  dy: number,
): NotePos => {
  if (drag.kind === 'move') {
    return {
      ...p,
      l: Math.max(0, drag.origL + dx),
      t: Math.max(0, drag.origT + dy),
    };
  }
  return {
    ...p,
    w: Math.min(MAX_W, Math.max(MIN_W, drag.origW + dx)),
    h: Math.min(MAX_H, Math.max(MIN_H, drag.origH + dy)),
  };
};

interface NoteDragApi {
  pos: { l: number; t: number; w: number; h: number };
  drag: DragState;
  onSurfacePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => Promise<void>;
}

type SetDrag = (drag: DragState) => void;

interface BeginMoveCtx {
  note: Note;
  editing: 'none' | 'title' | 'body';
  onPick: (e: ReactPointerEvent<HTMLDivElement>) => void;
  setDrag: SetDrag;
}

const beginMove = (
  e: ReactPointerEvent<HTMLDivElement>,
  { note, editing, onPick, setDrag }: BeginMoveCtx,
) => {
  if (editing !== 'none') return;
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest('[data-resize-handle]')) return;
  if (target.closest('[data-no-drag]')) return;
  onPick(e);
  if (e.shiftKey) return;
  capturePointer(e.currentTarget, e.pointerId);
  setDrag({
    kind: 'move',
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origL: note.l,
    origT: note.t,
  });
  e.preventDefault();
};

const beginResize = (
  e: ReactPointerEvent<HTMLDivElement>,
  note: Note,
  setDrag: SetDrag,
) => {
  if (e.button !== 0) return;
  e.stopPropagation();
  capturePointer(e.currentTarget, e.pointerId);
  setDrag({
    kind: 'resize',
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    origW: note.w,
    origH: note.h,
  });
};

const useNoteDrag = (
  note: Note,
  editing: 'none' | 'title' | 'body',
  onPick: (e: ReactPointerEvent<HTMLDivElement>) => void,
): NoteDragApi => {
  const [drag, setDrag] = useState<DragState>({ kind: 'idle' });
  const [pos, setPos] = useState({ l: note.l, t: note.t, w: note.w, h: note.h });

  useEffect(() => {
    if (drag.kind !== 'idle') return;
    setPos({ l: note.l, t: note.t, w: note.w, h: note.h });
  }, [note.l, note.t, note.w, note.h, drag.kind]);

  const onSurfacePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      beginMove(e, { note, editing, onPick, setDrag });
    },
    [editing, onPick, note],
  );

  const onResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      beginResize(e, note, setDrag);
    },
    [note],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.kind === 'idle') return;
      if (e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setPos((p) => applyDragDelta(p, drag, dx, dy));
    },
    [drag],
  );

  const onPointerUp = useCallback(
    async (e: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.kind === 'idle') return;
      if (e.pointerId !== drag.pointerId) return;
      releasePointer(e.currentTarget, e.pointerId);
      const patch =
        drag.kind === 'move'
          ? { l: pos.l, t: pos.t }
          : { w: pos.w, h: pos.h };
      await db.notes.update(note.id, patch);
      setDrag({ kind: 'idle' });
    },
    [drag, note.id, pos.l, pos.t, pos.w, pos.h],
  );

  return {
    pos,
    drag,
    onSurfacePointerDown,
    onResizePointerDown,
    onPointerMove,
    onPointerUp,
  };
};

interface NoteAddImageButtonProps {
  note: Note;
  onAddImages: (files: File[]) => void;
}

const NoteAddImageButton = ({ note, onAddImages }: NoteAddImageButtonProps) => (
  <FileInputTrigger
    accept={IMAGE_ACCEPT_ATTR}
    multiple
    onPick={onAddImages}
    data-testid={`brain-note-${note.id}-image-input`}
  >
    {(open) => (
      <IconButton
        icon={ImagePlus}
        label="Add picture"
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        data-no-drag
        iconSize="xs"
        data-testid={`brain-note-${note.id}-add-image`}
        className="h-4 w-4 rounded-sm text-ink-4 opacity-0 hover:bg-paper-2 group-hover:opacity-100"
      />
    )}
  </FileInputTrigger>
);

interface NoteHeaderProps {
  note: Note;
  dayChip: string;
  isSeedFetched: boolean;
  canAddImage: boolean;
  onAddImages: (files: File[]) => void;
  onOpenDetail: (e: React.MouseEvent) => void;
  onDocLinkClick: (e: React.MouseEvent) => void;
}

const NoteHeader = ({
  note,
  dayChip,
  isSeedFetched,
  canAddImage,
  onAddImages,
  onOpenDetail,
  onDocLinkClick,
}: NoteHeaderProps) => (
  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">
    <span data-testid={`brain-note-${note.id}-kind`}>
      {NOTE_KIND_LABEL[note.kind]}
    </span>
    <span className="flex-1" />
    {canAddImage && <NoteAddImageButton note={note} onAddImages={onAddImages} />}
    {note.linkedDocId && (
      <IconButton
        icon={ExternalLink}
        label="Open linked doc"
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={onDocLinkClick}
        data-no-drag
        iconSize="xs"
        data-testid={`brain-note-${note.id}-doc-link`}
        className="h-4 w-4 rounded-sm hover:bg-paper-2"
      />
    )}
    {isSeedFetched && (
      <Globe
        className="h-3 w-3 text-ink-4"
        aria-label="Fetched content"
        data-testid={`brain-note-${note.id}-fetched-icon`}
      />
    )}
    <span data-testid={`brain-note-${note.id}-day-chip`}>{dayChip}</span>
    <IconButton
      icon={ArrowUpRight}
      label="Open details"
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={onOpenDetail}
      data-no-drag
      iconSize="xs"
      data-testid={`brain-note-${note.id}-open-details`}
      className="ml-1 h-4 w-4 rounded-sm text-ink-4 opacity-0 hover:bg-paper-2 group-hover:opacity-100"
    />
  </div>
);

interface NoteTitleProps {
  note: Note;
  editing: boolean;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  onStartEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
}

const NoteTitle = ({
  note,
  editing,
  draftTitle,
  setDraftTitle,
  onStartEdit,
  onCommit,
  onCancel,
}: NoteTitleProps) => {
  if (editing) {
    return (
      <TextField
        variant="bare"
        autoFocus
        value={draftTitle}
        onChange={(e) => { setDraftTitle(e.target.value); }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="title"
        className="font-serif text-[13px] font-medium"
        data-no-drag
        data-testid={`brain-note-${note.id}-title-input`}
      />
    );
  }
  if (note.title) {
    return (
      <div
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={onStartEdit}
        data-no-drag
        data-testid={`brain-note-${note.id}-title`}
        className="cursor-text font-serif text-[13px] font-medium text-ink"
      >
        {note.title}
      </div>
    );
  }
  return (
    // @lint-ignore native-button: "+ title" hover-revealed placeholder trigger (begins inline edit); not a DS Button kind
    <button
      type="button"
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={onStartEdit}
      data-no-drag
      data-testid={`brain-note-${note.id}-add-title`}
      className="self-start font-mono text-[9px] uppercase tracking-wider text-ink-4 opacity-0 hover:text-ink-2 group-hover:opacity-100"
    >
      + title
    </button>
  );
};

interface NoteBodyProps {
  note: Note;
  editing: boolean;
  isSeedPrompt: boolean;
  draftBody: string;
  setDraftBody: (v: string) => void;
  onStartEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
}

const NoteBody = ({
  note,
  editing,
  isSeedPrompt,
  draftBody,
  setDraftBody,
  onStartEdit,
  onCommit,
  onCancel,
}: NoteBodyProps) => {
  if (editing) {
    return (
      <TextArea
        variant="bare"
        autoFocus
        rows={undefined}
        value={draftBody}
        onChange={(e) => { setDraftBody(e.target.value); }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        className={cn(
          'flex-1 resize-none font-serif text-[12px] leading-snug text-ink-2',
          isSeedPrompt && 'italic',
        )}
        data-no-drag
        data-testid={`brain-note-${note.id}-body-input`}
      />
    );
  }
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={onStartEdit}
      data-no-drag
      data-testid={`brain-note-${note.id}-body`}
      className={cn(
        'flex-1 cursor-text whitespace-pre-wrap font-serif text-[12px] leading-snug text-ink-2',
        isSeedPrompt && 'italic',
        !note.body && !isSeedPrompt && 'text-ink-4',
      )}
    >
      {note.body || (isSeedPrompt ? '' : '(click to write)')}
    </div>
  );
};

interface NoteImageStripProps {
  note: Note;
  attachments: NoteAttachment[];
  onRemove: (id: string) => void;
}

const NoteImageStrip = ({ note, attachments, onRemove }: NoteImageStripProps) => {
  if (attachments.length === 0) return null;
  return (
    <div
      data-no-drag
      onPointerDown={(e) => { e.stopPropagation(); }}
      data-testid={`brain-note-${note.id}-images`}
      className="flex flex-wrap gap-1"
    >
      {attachments.map((att) => (
        <ImageThumb
          key={att.id}
          blob={att.blob}
          name={att.name}
          size="sm"
          onRemove={() => { onRemove(att.id); }}
          removeTestId={`brain-note-${note.id}-image-${att.id}-remove`}
          data-testid={`brain-note-${note.id}-image-${att.id}`}
        />
      ))}
    </div>
  );
};

interface NoteFooterProps {
  note: Note;
  menu: { x: number; y: number } | null;
  onResizePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDelete: () => void;
  onCloseMenu: () => void;
}

const NoteFooter = ({
  note,
  menu,
  onResizePointerDown,
  onDelete,
  onCloseMenu,
}: NoteFooterProps) => (
  <>
    <div
      data-resize-handle
      onPointerDown={onResizePointerDown}
      className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
      aria-label="Resize note"
      data-testid={`brain-note-${note.id}-resize-handle`}
    />
    {menu && (
      <NoteContextMenu
        x={menu.x}
        y={menu.y}
        onDelete={onDelete}
        onClose={onCloseMenu}
      />
    )}
  </>
);

interface NoteContentProps {
  note: Note;
  isSeedPrompt: boolean;
  editing: 'none' | 'title' | 'body';
  setEditing: (v: 'none' | 'title' | 'body') => void;
  draftTitle: string;
  setDraftTitle: (v: string) => void;
  commitTitle: () => void;
  draftBody: string;
  setDraftBody: (v: string) => void;
  commitBody: () => void;
}

const NoteContent = ({
  note,
  isSeedPrompt,
  editing,
  setEditing,
  draftTitle,
  setDraftTitle,
  commitTitle,
  draftBody,
  setDraftBody,
  commitBody,
}: NoteContentProps) => (
  <>
    <NoteTitle
      note={note}
      editing={editing === 'title'}
      draftTitle={draftTitle}
      setDraftTitle={setDraftTitle}
      onStartEdit={() => { setEditing('title'); }}
      onCommit={commitTitle}
      onCancel={() => {
        setDraftTitle(note.title ?? '');
        setEditing('none');
      }}
    />
    <NoteBody
      note={note}
      editing={editing === 'body'}
      isSeedPrompt={isSeedPrompt}
      draftBody={draftBody}
      setDraftBody={setDraftBody}
      onStartEdit={() => { setEditing('body'); }}
      onCommit={commitBody}
      onCancel={() => {
        setDraftBody(note.body);
        setEditing('none');
      }}
    />
  </>
);

const useNoteEditing = (note: Note) => {
  const [editing, setEditing] = useState<'none' | 'title' | 'body'>('none');
  const [draftBody, setDraftBody] = useState(note.body);
  const [draftTitle, setDraftTitle] = useState(note.title ?? '');

  useEffect(() => {
    if (editing !== 'body') setDraftBody(note.body);
  }, [note.body, editing]);

  useEffect(() => {
    if (editing !== 'title') setDraftTitle(note.title ?? '');
  }, [note.title, editing]);

  const maybePromote = async () => {
    if (note.state !== NoteState.User) {
      await db.notes.update(note.id, { state: NoteState.User });
    }
  };

  const commitBody = async () => {
    setEditing('none');
    if (draftBody !== note.body) {
      await db.notes.update(note.id, { body: draftBody });
      await maybePromote();
    }
  };

  const commitTitle = async () => {
    setEditing('none');
    const next = draftTitle.trim() || undefined;
    if (next !== note.title) {
      await db.notes.update(note.id, { title: next });
      await maybePromote();
    }
  };

  return {
    editing,
    setEditing,
    draftBody,
    setDraftBody,
    draftTitle,
    setDraftTitle,
    commitBody,
    commitTitle,
  };
};

const useNoteActions = (note: Note, spaceId: string) => {
  const navigate = useNavigate();
  const openDetail = useUI((s) => s.openDetail);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const onOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDetail(note.id);
  };

  const onDocLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.linkedDocId) return;
    void navigate(routes.docWrite(spaceId, note.linkedDocId));
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const onDeleteFromMenu = async () => {
    setMenu(null);
    await deleteNoteWithCascade(note.id);
  };

  return {
    menu,
    setMenu,
    onOpenDetail,
    onDocLinkClick,
    onContextMenu,
    onDeleteFromMenu,
  };
};

const noteShellClass = ({
  selected,
  pending,
  isSeed,
  dragging,
}: {
  selected: boolean;
  pending: boolean;
  isSeed: boolean;
  dragging: boolean;
}) =>
  cn(
    'group absolute flex flex-col gap-1 border bg-paper p-2.5',
    selected || !isSeed ? 'border-ink' : 'border-rule',
    pending && 'outline-2 outline-dashed outline-ink-3 outline-offset-2',
    dragging ? 'cursor-grabbing' : 'cursor-grab',
    selected && 'outline outline-2 outline-ink outline-offset-2',
  );

const NoteShell = ({
  note,
  selected,
  pending,
  isSeed,
  dragState,
  onContextMenu,
  divRef,
  children,
}: {
  note: Note;
  selected: boolean;
  pending: boolean;
  isSeed: boolean;
  dragState: ReturnType<typeof useNoteDrag>;
  onContextMenu: ReturnType<typeof useNoteActions>['onContextMenu'];
  divRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) => (
  <div
    ref={divRef}
    data-testid={`brain-note-${note.id}`}
    onPointerDown={dragState.onSurfacePointerDown}
    onPointerMove={dragState.onPointerMove}
    onPointerUp={(e) => { void dragState.onPointerUp(e); }}
    onPointerCancel={(e) => { void dragState.onPointerUp(e); }}
    onContextMenu={onContextMenu}
    style={{
      left: dragState.pos.l,
      top: dragState.pos.t,
      width: dragState.pos.w,
      minHeight: dragState.pos.h,
    }}
    className={noteShellClass({
      selected,
      pending,
      isSeed,
      dragging: dragState.drag.kind !== 'idle',
    })}
  >
    {children}
  </div>
);

const NoteCardContent = ({
  note,
  isSeedPrompt,
  editing,
  attachments,
  onRemoveImage,
}: {
  note: Note;
  isSeedPrompt: boolean;
  editing: ReturnType<typeof useNoteEditing>;
  attachments: NoteAttachment[];
  onRemoveImage: (id: string) => void;
}) => (
  <>
    <NoteContent
      note={note}
      isSeedPrompt={isSeedPrompt}
      editing={editing.editing}
      setEditing={editing.setEditing}
      draftTitle={editing.draftTitle}
      setDraftTitle={editing.setDraftTitle}
      commitTitle={() => { void editing.commitTitle(); }}
      draftBody={editing.draftBody}
      setDraftBody={editing.setDraftBody}
      commitBody={() => { void editing.commitBody(); }}
    />
    <NoteImageStrip note={note} attachments={attachments} onRemove={onRemoveImage} />
  </>
);

export const BrainSpaceNote = ({
  note,
  spaceId,
  selected,
  pending,
  onPick,
}: BrainSpaceNoteProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const editing = useNoteEditing(note);
  const dragState = useNoteDrag(note, editing.editing, onPick);
  const actions = useNoteActions(note, spaceId);
  const attachments = useNoteAttachments(note.id);

  const dayChip = DAY[new Date(note.createdAt).getDay()] ?? 'now';
  const isSeedPrompt = note.state === NoteState.SeedPrompt;
  const isSeedFetched = note.state === NoteState.SeedFetched;
  const isSeed = isSeedPrompt || isSeedFetched;

  return (
    <NoteShell
      divRef={ref}
      note={note}
      selected={selected}
      pending={pending}
      isSeed={isSeed}
      dragState={dragState}
      onContextMenu={actions.onContextMenu}
    >
      <NoteHeader
        note={note}
        dayChip={dayChip}
        isSeedFetched={isSeedFetched}
        canAddImage={attachments.length < MAX_NOTE_IMAGES}
        onAddImages={(files) => { void addNoteImages(note, files); }}
        onOpenDetail={actions.onOpenDetail}
        onDocLinkClick={actions.onDocLinkClick}
      />

      <NoteCardContent
        note={note}
        isSeedPrompt={isSeedPrompt}
        editing={editing}
        attachments={attachments}
        onRemoveImage={(id) => { void deleteNoteAttachment(id); }}
      />

      <NoteFooter
        note={note}
        menu={actions.menu}
        onResizePointerDown={dragState.onResizePointerDown}
        onDelete={() => { void actions.onDeleteFromMenu(); }}
        onCloseMenu={() => { actions.setMenu(null); }}
      />
    </NoteShell>
  );
};
