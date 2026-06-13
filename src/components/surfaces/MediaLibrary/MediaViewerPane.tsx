import type { MediaItem } from '@/db/schema';
import { PdfViewer } from '@/components/ui/PdfViewer';
import { Eyebrow } from '@/components/ui/Eyebrow';

interface MediaViewerPaneProps {
  item: MediaItem | null;
}

export const MediaViewerPane = ({ item }: MediaViewerPaneProps) => {
  if (!item) {
    return (
      <div
        role="status"
        className="flex flex-1 items-center justify-center font-mono text-[10px] uppercase tracking-wider text-ink-3"
        data-testid="media-viewer-empty"
      >
        Select a PDF to preview
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="media-viewer">
      <Eyebrow
        size={10}
        tone="ink3"
        className="flex items-center gap-1.5 border-b border-rule px-3 py-2"
        data-testid="media-viewer-meta"
      >
        <span>PDF</span>
        <span aria-hidden>·</span>
        <span className="min-w-0 truncate normal-case" title={item.name}>
          {item.name}
        </span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{`${String(item.pageCount)} pages`}</span>
      </Eyebrow>
      <div className="min-h-0 flex-1">
        <PdfViewer
          blob={item.blob}
          name={item.name}
          mode="pane"
          pageCount={item.pageCount}
        />
      </div>
    </div>
  );
};
