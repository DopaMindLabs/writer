import type { Note } from '@/db/schema';
import { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import { filenameFromUrl } from '@/lib/pdf-url-cache';
import { PdfCardUrlInput } from './PdfCardUrlInput';
import { PdfCardFetching } from './PdfCardFetching';
import { PdfCardError } from './PdfCardError';
import { PdfCardThumbnail } from './PdfCardThumbnail';
import { PdfCardCommentary } from './PdfCardCommentary';
import { PdfCardActions } from './PdfCardActions';
import {
  useAutoFetchOnUrlChange,
  useCardController,
} from './usePdfCardController';

interface PdfCardContentProps {
  note: Note;
}

export const PdfCardContent = ({ note }: PdfCardContentProps) => {
  const cache = useNoteUrlCache(note.id);
  const ctrl = useCardController(note);
  useAutoFetchOnUrlChange(note, cache, ctrl.fetcher);

  if (!note.pdfUrl || ctrl.editingUrl) {
    return (
      <PdfCardUrlInput
        initialValue={note.pdfUrl ?? ''}
        busy={ctrl.fetcher.status.kind === 'fetching'}
        onSubmit={(next) => { void ctrl.submitUrl(next); }}
        onCancel={ctrl.editingUrl ? () => { ctrl.setEditingUrl(false); } : undefined}
        testIdPrefix={`brain-note-${note.id}-pdf-url`}
      />
    );
  }
  if (ctrl.fetcher.status.kind === 'fetching') {
    return <PdfCardFetching noteId={note.id} />;
  }
  if (ctrl.fetcher.status.kind === 'error') {
    return (
      <PdfCardError
        noteId={note.id}
        url={note.pdfUrl}
        message={ctrl.fetcher.status.message}
        busy={false}
        onResubmit={(next) => { void ctrl.submitUrl(next); }}
      />
    );
  }
  if (cache) {
    const name = filenameFromUrl(cache.url);
    return (
      <>
        <PdfCardThumbnail
          noteId={note.id}
          name={name}
          blob={cache.blob}
          pageCount={cache.pageCount}
        />
        <PdfCardCommentary note={note} />
        <PdfCardActions
          noteId={note.id}
          busy={false}
          onOpenBeside={ctrl.openBeside}
          onEditUrl={() => { ctrl.setEditingUrl(true); }}
          onRefresh={() => { void ctrl.refresh(); }}
        />
      </>
    );
  }
  return <PdfCardFetching noteId={note.id} />;
};
