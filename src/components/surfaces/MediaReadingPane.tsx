import { useLiveQuery } from 'dexie-react-hooks';
import { X } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import { useMediaItem } from '@/hooks/useMedia';
import { resolvePdfSource } from '@/components/surfaces/PdfCard/resolvePdfSource';
import { IconButton } from '@/components/ui/icon';
import { PdfViewer } from '@/components/ui/PdfViewer';

interface NotePdfPaneProps {
  noteId: string;
  onClose: () => void;
}

const NotePdfPane = ({ noteId, onClose }: NotePdfPaneProps) => {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId], undefined);
  const cache = useNoteUrlCache(noteId);
  const mediaItem = useMediaItem(note?.mediaItemId);
  const resolved = note ? resolvePdfSource(note, cache, mediaItem) : null;
  const name = resolved?.name ?? 'PDF';
  return (
    <aside
      aria-label={`PDF reading pane, ${name}`}
      className="fixed inset-0 z-40 flex h-full w-full flex-col bg-paper animate-in slide-in-from-right duration-200 md:static md:inset-auto md:z-auto md:w-[36rem] md:shrink-0 md:border-l md:border-rule"
      data-testid="media-reading-pane"
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule px-2">
        <span
          className="truncate px-2 font-mono text-[10px] uppercase tracking-wider text-ink-3"
          data-testid="media-reading-pane-title"
        >
          {`Reading: ${name}`}
        </span>
        <IconButton
          icon={X}
          iconSize="md"
          label="Close reading pane"
          onClick={onClose}
          data-testid="media-reading-pane-close"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {resolved ? (
          <PdfViewer
            blob={resolved.blob}
            name={name}
            mode="pane"
            pageCount={resolved.pageCount}
          />
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-1 items-center justify-center font-mono text-[10px] uppercase tracking-wider text-ink-3"
            data-testid="media-reading-pane-empty"
          >
            loading PDF…
          </div>
        )}
      </div>
    </aside>
  );
};

export const MediaReadingPane = () => {
  const source = useUI((s) => s.mediaReadingPane);
  const close = useUI((s) => s.closeMediaReadingPane);
  if (!source) return null;
  return <NotePdfPane noteId={source.noteId} onClose={close} />;
};
