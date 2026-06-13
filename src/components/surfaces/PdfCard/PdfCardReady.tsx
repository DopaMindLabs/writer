import type { Note } from '@/db/schema';
import { PdfCardThumbnail } from './PdfCardThumbnail';
import { PdfCardCommentary } from './PdfCardCommentary';
import { PdfCardActions } from './PdfCardActions';

interface PdfCardReadyProps {
  note: Note;
  name: string;
  blob: Blob;
  pageCount: number;
  onOpenBeside: () => void;
  onEditSource: () => void;
  onRefresh?: () => void;
}

export const PdfCardReady = ({
  note,
  name,
  blob,
  pageCount,
  onOpenBeside,
  onEditSource,
  onRefresh,
}: PdfCardReadyProps) => (
  <>
    <PdfCardThumbnail
      noteId={note.id}
      name={name}
      blob={blob}
      pageCount={pageCount}
    />
    <PdfCardCommentary note={note} />
    <PdfCardActions
      noteId={note.id}
      busy={false}
      onOpenBeside={onOpenBeside}
      onEditSource={onEditSource}
      onRefresh={onRefresh}
    />
  </>
);
