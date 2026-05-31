import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  ImagePlus,
  Link2,
  Trash2,
  X,
} from '@/components/libs/icons';
import {
  DialogPrimitiveContent,
  DialogPrimitiveDescription,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveRoot,
  DialogPrimitiveTitle,
} from '@/components/ui/dialog.primitives';
import { db } from '@/db/db';
import { deleteNoteWithCascade } from '@/db/seed';
import { useUI } from '@/store/ui';
import { useDocuments } from '@/hooks/useDocuments';
import { useConnectionsForNote } from '@/hooks/useConnections';
import { useNoteAttachments } from '@/hooks/useNoteAttachments';
import { NOTE_KIND_LABEL } from '@/data/note-kinds';
import { IMAGE_ACCEPT_ATTR, MAX_NOTE_IMAGES } from '@/data/note-attachments';
import { addNoteImages, deleteNoteAttachment } from '@/lib/note-attachments';
import {
  NoteState,
  type Note,
  type Connection,
  type Doc,
  type NoteAttachment,
} from '@/db/schema';
import { routes } from '@/lib/routes';
import { TextField } from '@/components/ui/TextField';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Icon, IconButton } from '@/components/ui/icon';
import { FileInputTrigger } from '@/components/ui/FileInputTrigger';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { InlineBanner } from '@/components/ui/InlineBanner';
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

interface ConnectionRowExtras {
  testIdBase: string;
}

const ConnectionRow = ({
  direction,
  note,
  onFocus,
  onDelete,
  testIdBase,
}: ConnectionRowProps & ConnectionRowExtras) => {
  const titleText = note?.title ?? '';
  const firstBodyLine = note?.body.split('\n')[0] ?? '';
  const label =
    titleText !== ''
      ? titleText
      : firstBodyLine !== ''
        ? firstBodyLine
        : '(untitled)';
  const arrow = direction === 'out' ? '→' : '←';
  return (
    <li
      data-testid={testIdBase}
      className="flex items-center gap-2 border border-rule bg-paper px-2 py-1.5"
    >
      {/* @lint-ignore native-button: connection-row content trigger (multi-element label inside a list item); not a DS Button kind */}
      <button
        type="button"
        data-testid={`${testIdBase}-focus`}
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
        data-testid={`${testIdBase}-remove`}
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

interface LinkedDocSectionProps {
  note: Note;
  docs: Doc[];
  linkedDoc: Doc | undefined;
  onLinkDoc: (docId: string) => void;
  onOpenDoc: () => void;
}

const LinkedDocSection = ({
  note,
  docs,
  linkedDoc,
  onLinkDoc,
  onOpenDoc,
}: LinkedDocSectionProps) => (
  <section className="mb-6">
    <Label
      htmlFor="drawer-doc-link"
      tone="ink3"
      weight="regular"
      className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
    >
      <Link2 className="h-3 w-3" />
      Linked Doc
    </Label>
    <div className="flex items-center gap-2">
      <Select
        id="drawer-doc-link"
        data-testid="brain-detail-drawer-linked-doc"
        value={note.linkedDocId ?? ''}
        onChange={(e) => { onLinkDoc(e.target.value); }}
        className="flex-1"
        options={[
          { value: '', label: '— No linked doc —' },
          ...docs.map((d) => ({
            value: d.id,
            label: d.name || 'Untitled',
          })),
        ]}
      />
      {linkedDoc && (
        <Button
          data-testid="brain-detail-drawer-open"
          kind="secondary"
          onClick={onOpenDoc}
          className="gap-1.5 border-ink px-3 py-2 font-mono text-[10px] uppercase tracking-wider"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </Button>
      )}
    </div>
  </section>
);

interface ConnectionsSectionProps {
  incoming: Connection[];
  outgoing: Connection[];
  relatedById: Map<string, Note>;
  onFocusNote: (id: string) => void;
  onDeleteConnection: (connectionId: string) => void;
}

const ConnectionsSection = ({
  incoming,
  outgoing,
  relatedById,
  onFocusNote,
  onDeleteConnection,
}: ConnectionsSectionProps) => (
  <section>
    <TypographyLabel asChild variant="wide" className="mb-2">
      <h3 data-testid="brain-detail-drawer-connections-heading">
        Connections ({incoming.length + outgoing.length})
      </h3>
    </TypographyLabel>
    {incoming.length + outgoing.length === 0 ? (
      <p
        data-testid="brain-detail-drawer-connections-empty"
        className="font-mono text-[11px] text-ink-4"
      >
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
              onFocus={() => { if (other) onFocusNote(other.id); }}
              onDelete={() => { onDeleteConnection(c.id); }}
              testIdBase={`brain-detail-drawer-connection-${c.id}`}
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
              onFocus={() => { if (other) onFocusNote(other.id); }}
              onDelete={() => { onDeleteConnection(c.id); }}
              testIdBase={`brain-detail-drawer-connection-${c.id}`}
            />
          );
        })}
      </ul>
    )}
  </section>
);

const DrawerHeader = ({
  note,
  onClose,
}: {
  note: Note;
  onClose: () => void;
}) => {
  const [draftTitle, setDraftTitle] = useState(note.title ?? '');

  useEffect(() => {
    setDraftTitle(note.title ?? '');
  }, [note.id, note.title]);

  const commitTitle = async () => {
    const next = draftTitle.trim() || undefined;
    if (next !== note.title) {
      await db.notes.update(note.id, { title: next, state: NoteState.User });
    }
  };

  return (
    <header className="flex items-start justify-between border-b border-rule p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-4">
          {NOTE_KIND_LABEL[note.kind]}
        </span>
        <TextField
          data-testid="brain-detail-drawer-title"
          variant="bare"
          value={draftTitle}
          onChange={(e) => { setDraftTitle(e.target.value); }}
          onBlur={() => { void commitTitle(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Untitled"
          className="font-serif text-xl font-medium"
          aria-label="Note title"
        />
      </div>
      <IconButton
        data-testid="brain-detail-drawer-close"
        icon={X}
        label="Close drawer"
        buttonSize="sm"
        iconSize="sm"
        onClick={onClose}
        className="ml-2 text-ink-4"
      />
    </header>
  );
};

const BodySection = ({ note }: { note: Note }) => {
  const [draftBody, setDraftBody] = useState(note.body);

  useEffect(() => {
    setDraftBody(note.body);
  }, [note.id, note.body]);

  const commitBody = async () => {
    if (draftBody !== note.body) {
      await db.notes.update(note.id, { body: draftBody, state: NoteState.User });
    }
  };

  return (
    <section className="mb-6">
      <Label
        htmlFor="drawer-body"
        tone="ink3"
        weight="regular"
        className="mb-2 block font-mono text-[10px] uppercase tracking-wider"
      >
        Body
      </Label>
      <TextArea
        id="drawer-body"
        data-testid="brain-detail-drawer-body"
        value={draftBody}
        onChange={(e) => { setDraftBody(e.target.value); }}
        onBlur={() => { void commitBody(); }}
        placeholder="Write something…"
        className="min-h-[160px] leading-relaxed"
      />
    </section>
  );
};

const AttachmentsHeader = ({ count }: { count: number }) => (
  <div className="mb-2 flex items-center justify-between">
    <Label
      tone="ink3"
      weight="regular"
      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
    >
      <ImagePlus className="h-3 w-3" />
      Pictures
    </Label>
    <span
      data-testid="brain-detail-drawer-attachments-count"
      className="font-mono text-[10px] text-ink-4"
    >
      {count} / {MAX_NOTE_IMAGES}
    </span>
  </div>
);

const AttachmentsGrid = ({ attachments }: { attachments: NoteAttachment[] }) => {
  if (attachments.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((att) => (
        <ImageThumb
          key={att.id}
          blob={att.blob}
          name={att.name}
          size="md"
          onRemove={() => { void deleteNoteAttachment(att.id); }}
          removeTestId={`brain-detail-drawer-attachments-image-${att.id}-remove`}
          data-testid={`brain-detail-drawer-attachments-image-${att.id}`}
        />
      ))}
    </div>
  );
};

interface AttachmentsUploadProps {
  atLimit: boolean;
  onPick: (files: File[]) => void;
}

const AttachmentsUpload = ({ atLimit, onPick }: AttachmentsUploadProps) => (
  <>
    <FileInputTrigger
      accept={IMAGE_ACCEPT_ATTR}
      multiple
      disabled={atLimit}
      onPick={onPick}
      data-testid="brain-detail-drawer-attachments-input"
    >
      {(open) => (
        <Button
          kind="secondary"
          size="sm"
          disabled={atLimit}
          onClick={open}
          data-testid="brain-detail-drawer-attachments-upload"
          className="gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider"
        >
          <Icon icon={ImagePlus} size="xs" />
          Add picture
        </Button>
      )}
    </FileInputTrigger>
    {atLimit && (
      <p
        data-testid="brain-detail-drawer-attachments-limit-hint"
        className="mt-1.5 font-mono text-[10px] text-ink-4"
      >
        limit of {MAX_NOTE_IMAGES} reached — remove one to add another.
      </p>
    )}
  </>
);

interface AttachmentsSectionProps {
  note: Note;
  attachments: NoteAttachment[];
}

const AttachmentsSection = ({ note, attachments }: AttachmentsSectionProps) => {
  const [rejected, setRejected] = useState<string[]>([]);
  const atLimit = attachments.length >= MAX_NOTE_IMAGES;

  const handlePick = async (files: File[]) => {
    const result = await addNoteImages(note, files);
    setRejected(result.rejected);
  };

  return (
    <section className="mb-6" data-testid="brain-detail-drawer-attachments">
      <AttachmentsHeader count={attachments.length} />
      {rejected.length > 0 && (
        <InlineBanner
          kind="warning"
          dismissible
          onDismiss={() => { setRejected([]); }}
          className="mb-2"
          data-testid="brain-detail-drawer-attachments-reject-banner"
        >
          {rejected.join('; ')}
        </InlineBanner>
      )}
      <AttachmentsGrid attachments={attachments} />
      <AttachmentsUpload
        atLimit={atLimit}
        onPick={(files) => { void handlePick(files); }}
      />
    </section>
  );
};

interface DrawerBodyProps {
  note: Note;
  spaceId: string;
  onFocusNote: (id: string) => void;
  onClose: () => void;
}

const useRelatedNotesById = (
  incoming: Connection[],
  outgoing: Connection[],
): Map<string, Note> => {
  const otherNoteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of incoming) ids.add(c.fromNoteId);
    for (const c of outgoing) ids.add(c.toNoteId);
    return Array.from(ids);
  }, [incoming, outgoing]);

  const relatedNotes = useLiveQuery(
    async () => {
      if (otherNoteIds.length === 0) return [];
      return db.notes.where('id').anyOf(otherNoteIds).toArray();
    },
    [otherNoteIds.join(',')],
    [],
  );

  return useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of relatedNotes) m.set(n.id, n);
    return m;
  }, [relatedNotes]);
};

const DrawerDeleteFooter = ({ onDelete }: { onDelete: () => void }) => (
  <footer className="flex items-center justify-end border-t border-rule p-3">
    <Button
      data-testid="brain-detail-drawer-delete"
      kind="dangerous"
      size="sm"
      onClick={onDelete}
      className="gap-1.5 border-0 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider"
    >
      <Trash2 className="h-3 w-3" />
      Delete note
    </Button>
  </footer>
);

const DrawerBody = ({ note, spaceId, onFocusNote, onClose }: DrawerBodyProps) => {
  const navigate = useNavigate();
  const docs = useDocuments(spaceId) ?? [];
  const { incoming, outgoing } = useConnectionsForNote(note.id);
  const relatedById = useRelatedNotesById(incoming, outgoing);
  const attachments = useNoteAttachments(note.id);

  const linkedDoc = note.linkedDocId
    ? docs.find((d) => d.id === note.linkedDocId)
    : undefined;

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
    void navigate(routes.docWrite(spaceId, note.linkedDocId));
  };

  return (
    <>
      <DrawerHeader note={note} onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <BodySection note={note} />

        <AttachmentsSection note={note} attachments={attachments} />

        <LinkedDocSection
          note={note}
          docs={docs}
          linkedDoc={linkedDoc}
          onLinkDoc={(docId) => { void handleLinkDoc(docId); }}
          onOpenDoc={handleOpenDoc}
        />

        <ConnectionsSection
          incoming={incoming}
          outgoing={outgoing}
          relatedById={relatedById}
          onFocusNote={onFocusNote}
          onDeleteConnection={(id) => { void handleDeleteConnection(id); }}
        />
      </div>

      <DrawerDeleteFooter onDelete={() => { void handleDeleteNote(); }} />
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
    <DialogPrimitiveRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDetail();
      }}
    >
      <DialogPrimitivePortal>
        <DialogPrimitiveOverlay
          className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitiveContent
          data-testid="brain-detail-drawer"
          className={cn(
            'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-rule bg-paper shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          )}
        >
          <DialogPrimitiveTitle className="sr-only">
            Note details
          </DialogPrimitiveTitle>
          <DialogPrimitiveDescription className="sr-only">
            Edit the selected note and manage its connections.
          </DialogPrimitiveDescription>
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
        </DialogPrimitiveContent>
      </DialogPrimitivePortal>
    </DialogPrimitiveRoot>
  );
};
