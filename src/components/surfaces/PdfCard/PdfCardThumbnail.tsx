import { PdfViewer } from '@/components/ui/PdfViewer';
import { Eyebrow } from '@/components/ui/Eyebrow';

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
    <Eyebrow
      size={10}
      tone="ink3"
      className="flex items-center gap-1.5"
      data-testid={`brain-note-${noteId}-pdf-meta`}
    >
      <span>PDF</span>
      <span aria-hidden>·</span>
      <span className="min-w-0 truncate normal-case" title={name}>{name}</span>
      <span aria-hidden>·</span>
      <span className="shrink-0">{`${String(pageCount)} pages`}</span>
    </Eyebrow>
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
