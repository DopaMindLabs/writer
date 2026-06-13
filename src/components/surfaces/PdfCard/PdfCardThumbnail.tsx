import { PdfViewer } from '@/components/ui/PdfViewer';

interface PdfCardThumbnailProps {
  noteId: string;
  name: string;
  blob: Blob;
  pageCount: number;
}

export const PdfCardThumbnail = ({
  noteId,
  name,
  blob,
  pageCount,
}: PdfCardThumbnailProps) => (
  <>
    <div
      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3"
      data-testid={`brain-note-${noteId}-pdf-meta`}
    >
      <span className="truncate" title={name}>{name}</span>
      <span aria-hidden>·</span>
      <span>{`${String(pageCount)} pages`}</span>
    </div>
    <div
      data-no-drag
      onPointerDown={(e) => { e.stopPropagation(); }}
      data-testid={`brain-note-${noteId}-pdf-thumb`}
      className="border border-rule bg-paper-2"
    >
      <PdfViewer blob={blob} name={name} mode="thumbnail" pageCount={pageCount} />
    </div>
  </>
);
