import { X } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import { filenameFromUrl } from '@/lib/pdf-url-cache';
import { IconButton } from '@/components/ui/icon';
import { PdfViewer } from '@/components/ui/PdfViewer';

interface NotePdfPaneProps {
  noteId: string;
  onClose: () => void;
}

const NotePdfPane = ({ noteId, onClose }: NotePdfPaneProps) => {
  const cache = useNoteUrlCache(noteId);
  const name = cache ? filenameFromUrl(cache.url) : 'PDF';
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
        {cache ? (
          <PdfViewer
            blob={cache.blob}
            name={name}
            mode="pane"
            pageCount={cache.pageCount}
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
