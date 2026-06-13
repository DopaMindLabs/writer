import type { MediaItem } from '@/db/schema';
import { PdfViewer } from '@/components/ui/PdfViewer';

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
  // The PdfViewer renders its own toolbar (name · page · count), so this pane
  // doesn't repeat the title.
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="media-viewer">
      <PdfViewer
        blob={item.blob}
        name={item.name}
        mode="pane"
        pageCount={item.pageCount}
      />
    </div>
  );
};
