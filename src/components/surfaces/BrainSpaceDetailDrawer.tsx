import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Link2, Trash2, X } from '@/components/libs/icons';
import { DialogPrimitive } from '@/components/libs/primitives';
import { db } from '@/db/db';
import { deleteNoteWithCascade } from '@/db/seed';
import { useUI } from '@/store/ui';
import { useDocuments } from '@/hooks/useDocuments';
import { useConnectionsForNote } from '@/hooks/useConnections';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { NoteState, type Note } from '@/db/schema';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/icon';
import { TypographyLabel } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface BrainSpaceDetailDrawerProps {
  spaceId: string;
}

interface ConnectionRowProps {
  direction: 'in' | 'out';
  note: Note | undefined;
  onFocus: () => void;
  onDelete: () => void;
}

const ConnectionRow = ({ direction, note, onFocus, onDelete }: ConnectionRowProps) => {
  const label = note?.title || note?.body?.split('\n')[0] || '(untitled)';
  const arrow = direction === 'out' ? '→' : '←';
  return (
    <li className="flex items-center gap-2 border border-rule bg-paper px-2 py-1.5">
      <button
        type="button"
        onClick={onFocus}
        disabled={!note}
        className="flex min-w-0 flex-1 items-center gap-2 text-left font-serif text-[13px] text-ink hover:underline disabled:cursor-not-allowed disabled:text-ink-4"
      >
        <span className="font-mono text-[11px] text-ink-3">{arrow}</span>
        <span className="min-w-0 truncate">{label}</span>
        {note && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-ink-4">
            {NOTE_KIND_LABEL[note.kind]}
          </span>
        )}
      </button>
      <IconButton
        icon={X}
        label="Remove connection"
        buttonSize="sm"
        iconSize="xs"
        onClick={onDelete}
        className="h-5 w-5 text-ink-4"
      />
    </li>
  );
};

interface DrawerBodyProps {
  note: Note;
  spaceId: string;
  onFocusNote: (id: string) => void;
  onClose: () => void;
}

const DrawerBody = ({ note, spaceId, onFocusNote, onClose }: DrawerBodyProps) => {
  const navigate = useNavigate();
  const docs = useDocuments(spaceId);
  const { incoming, outgoing } = useConnectionsForNote(note.id);
  const [draftTitle, setDraftTitle] = useState(note.title ?? '');
  const [draftBody, setDraftBody] = useState(note.body);

  useEffect(() => {
    setDraftTitle(note.title ?? '');
    setDraftBody(note.body);
  }, [note.id, note.title, note.body]);

  const otherNoteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of incoming) ids.add(c.fromNoteId);
    for (const c of outgoing) ids.add(c.toNoteId);
    return Array.from(ids);
  }, [incoming, outgoing]);

  const relatedNotes =
    useLiveQuery(
      async () => {
        if (otherNoteIds.length === 0) return [];
        return db.notes.where('id').anyOf(otherNoteIds).toArray();
      },
      [otherNoteIds.join(',')],
      [],
    ) ?? [];

  const relatedById = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of relatedNotes) m.set(n.id, n);
    return m;
  }, [relatedNotes]);

  const linkedDoc = note.linkedDocId
    ? docs.find((d) => d.id === note.linkedDocId)
    : undefined;

  const commitTitle = async () => {
    const next = draftTitle.trim() || undefined;
    if (next !== note.title) {
      await db.notes.update(note.id, {
        title: next,
        state: NoteState.User,
      });
    }
  };

  const commitBody = async () => {
    if (draftBody !== note.body) {
      await db.notes.update(note.id, {
        body: draftBody,
        state: NoteState.User,
      });
    }
  };

  const handleLinkDoc = async (docId: string) => {
    await db.notes.update(note.id, {
      linkedDocId: docId === '' ? undefined : docId,
    });
  };

  const handleDeleteConnection = async (connectionId: string) => {
    await db.connections.delete(connectionId);
  };

  const handleDeleteNote = async () => {
    await deleteNoteWithCascade(note.id);
    onClose();
  };

  const handleOpenDoc = () => {
    if (!note.linkedDocId) return;
    onClose();
    navigate(`/s/${spaceId}/d/${note.linkedDocId}`);
  };

  return (
    <>
      <header className="flex items-start justify-between border-b border-rule p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">
            {NOTE_KIND_LABEL[note.kind]}
          </span>
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="Untitled"
            className="border-0 bg-transparent p-0 font-serif text-xl font-medium text-ink outline-none placeholder:text-ink-4"
            aria-label="Note title"
          />
        </div>
        <IconButton
          icon={X}
          label="Close drawer"
          buttonSize="sm"
          iconSize="sm"
          onClick={onClose}
          className="ml-2 text-ink-4"
        />
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <section className="mb-6">
          <label
            htmlFor="drawer-body"
            className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-3"
          >
            Body
          </label>
          <textarea
            id="drawer-body"
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            onBlur={commitBody}
            placeholder="Write something…"
            className="min-h-[160px] w-full resize-y border border-rule bg-paper p-2 font-serif text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
        </section>

        <section className="mb-6">
          <label
            htmlFor="drawer-doc-link"
            className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3"
          >
            <Link2 className="h-3 w-3" />
            Linked Doc
          </label>
          <div className="flex items-center gap-2">
            <select
              id="drawer-doc-link"
              value={note.linkedDocId ?? ''}
              onChange={(e) => handleLinkDoc(e.target.value)}
              className="flex-1 border border-rule bg-paper p-2 font-sans text-[13px] text-ink outline-none focus:border-ink"
            >
              <option value="">— No linked doc —</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || 'Untitled'}
                </option>
              ))}
            </select>
            {linkedDoc && (
              <Button
                kind="secondary"
                onClick={handleOpenDoc}
                className="gap-1.5 border-ink px-3 py-2 font-mono text-[10px] uppercase tracking-wider"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </Button>
            )}
          </div>
        </section>

        <section>
          <TypographyLabel asChild variant="wide" className="mb-2">
            <h3>Connections ({incoming.length + outgoing.length})</h3>
          </TypographyLabel>
          {incoming.length + outgoing.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-4">
              shift-click another note on the canvas to connect.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {outgoing.map((c) => {
                const other = relatedById.get(c.toNoteId);
                return (
                  <ConnectionRow
                    key={c.id}
                    direction="out"
                    note={other}
                    onFocus={() => other && onFocusNote(other.id)}
                    onDelete={() => handleDeleteConnection(c.id)}
                  />
                );
              })}
              {incoming.map((c) => {
                const other = relatedById.get(c.fromNoteId);
                return (
                  <ConnectionRow
                    key={c.id}
                    direction="in"
                    note={other}
                    onFocus={() => other && onFocusNote(other.id)}
                    onDelete={() => handleDeleteConnection(c.id)}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="flex items-center justify-end border-t border-rule p-3">
        <Button
          kind="dangerous"
          size="sm"
          onClick={handleDeleteNote}
          className="gap-1.5 border-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider"
        >
          <Trash2 className="h-3 w-3" />
          Delete note
        </Button>
      </footer>
    </>
  );
};

export const BrainSpaceDetailDrawer = ({ spaceId }: BrainSpaceDetailDrawerProps) => {
  const detailNoteId = useUI((s) => s.detailNoteId);
  const closeDetail = useUI((s) => s.closeDetail);
  const focusNote = useUI((s) => s.focusNote);
  const openDetail = useUI((s) => s.openDetail);

  const note = useLiveQuery(
    () => (detailNoteId ? db.notes.get(detailNoteId) : undefined),
    [detailNoteId],
    undefined,
  );

  const open = Boolean(detailNoteId && note);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDetail();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-rule bg-paper shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Note details
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Edit the selected note and manage its connections.
          </DialogPrimitive.Description>
          {note ? (
            <DrawerBody
              note={note}
              spaceId={spaceId}
              onFocusNote={(id) => {
                focusNote(id);
                openDetail(id);
              }}
              onClose={closeDetail}
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
