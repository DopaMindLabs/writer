import type { Note } from '@/db/schema';
import { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import { useMediaItem } from '@/hooks/useMedia';
import { MediaPickerDialog } from '@/components/ui/MediaPickerDialog/MediaPickerDialog';
import { PdfCardEmpty } from './PdfCardEmpty';
import { PdfCardFetching } from './PdfCardFetching';
import { PdfCardError } from './PdfCardError';
import { PdfCardReady } from './PdfCardReady';
import { resolvePdfSource } from './resolvePdfSource';
import {
  useAutoFetchOnUrlChange,
  useCardController,
} from './usePdfCardController';

interface PdfCardContentProps {
  note: Note;
}

export const PdfCardContent = ({ note }: PdfCardContentProps) => {
  const cache = useNoteUrlCache(note.id);
  const mediaItem = useMediaItem(note.mediaItemId);
  const ctrl = useCardController(note);
  useAutoFetchOnUrlChange(note, cache, ctrl.fetcher);

  const openPicker = () => { ctrl.setPickerOpen(true); };
  const picker = (
    <MediaPickerDialog
      open={ctrl.pickerOpen}
      onOpenChange={ctrl.setPickerOpen}
      spaceId={note.spaceId}
      onSelect={(selection) => { void ctrl.applySelection(selection); }}
    />
  );

  if (!note.pdfUrl && !note.mediaItemId) {
    return (
      <>
        <PdfCardEmpty noteId={note.id} onPick={openPicker} />
        {picker}
      </>
    );
  }
  if (note.pdfUrl && ctrl.fetcher.status.kind === 'fetching') {
    return (<><PdfCardFetching noteId={note.id} />{picker}</>);
  }
  if (note.pdfUrl && ctrl.fetcher.status.kind === 'error') {
    return (
      <>
        <PdfCardError
          noteId={note.id}
          message={ctrl.fetcher.status.message}
          onEdit={openPicker}
        />
        {picker}
      </>
    );
  }

  const resolved = resolvePdfSource(note, cache, mediaItem);
  if (resolved) {
    return (
      <>
        <PdfCardReady
          note={note}
          name={resolved.name}
          blob={resolved.blob}
          pageCount={resolved.pageCount}
          onOpenBeside={ctrl.openBeside}
          onEditSource={openPicker}
          onRefresh={note.pdfUrl ? () => { void ctrl.refresh(); } : undefined}
        />
        {picker}
      </>
    );
  }
  return (<><PdfCardFetching noteId={note.id} />{picker}</>);
};
