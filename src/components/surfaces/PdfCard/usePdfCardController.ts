import { useEffect, useRef, useState } from 'react';
import { useUI } from '@/store/ui';
import { db } from '@/db/db';
import type { Note } from '@/db/schema';
import type { useNoteUrlCache } from '@/hooks/useNoteUrlCache';
import {
  fetchAndCachePdf,
  invalidateUrlCache,
  type FetchFailureReason,
} from '@/lib/pdf-url-cache';
import type { MediaSelection } from '@/components/ui/MediaPickerDialog/mediaSelection';

export type FetchStatus =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'error'; reason: FetchFailureReason; message: string };

export const useFetchPdf = (noteId: string) => {
  const [status, setStatus] = useState<FetchStatus>({ kind: 'idle' });
  const run = async (url: string) => {
    setStatus({ kind: 'fetching' });
    const result = await fetchAndCachePdf(noteId, url);
    if (result.ok) {
      setStatus({ kind: 'idle' });
    } else {
      setStatus({ kind: 'error', reason: result.reason, message: result.message });
    }
  };
  return { status, run, reset: () => { setStatus({ kind: 'idle' }); } };
};

export const useAutoFetchOnUrlChange = (
  note: Note,
  cache: ReturnType<typeof useNoteUrlCache>,
  fetcher: ReturnType<typeof useFetchPdf>,
) => {
  const lastTriedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!note.pdfUrl || note.mediaItemId) return;
    if (cache?.url === note.pdfUrl) return;
    if (fetcher.status.kind !== 'idle') return;
    if (lastTriedRef.current === note.pdfUrl) return;
    lastTriedRef.current = note.pdfUrl;
    void fetcher.run(note.pdfUrl);
  }, [note.pdfUrl, note.mediaItemId, cache, fetcher]);
};

export interface CardController {
  fetcher: ReturnType<typeof useFetchPdf>;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  applySelection: (selection: MediaSelection) => Promise<void>;
  refresh: () => Promise<void>;
  openBeside: () => void;
}

export const useCardController = (note: Note): CardController => {
  const openPane = useUI((s) => s.openMediaReadingPaneForNote);
  const fetcher = useFetchPdf(note.id);
  const [pickerOpen, setPickerOpen] = useState(false);

  const applySelection = async (selection: MediaSelection) => {
    await invalidateUrlCache(note.id);
    if (selection.kind === 'url') {
      await db.notes.update(note.id, {
        pdfUrl: selection.url,
        mediaItemId: undefined,
      });
      await fetcher.run(selection.url);
    } else {
      await db.notes.update(note.id, {
        mediaItemId: selection.mediaItemId,
        pdfUrl: undefined,
      });
      fetcher.reset();
    }
  };

  const refresh = async () => {
    if (!note.pdfUrl) return;
    await invalidateUrlCache(note.id);
    await fetcher.run(note.pdfUrl);
  };

  const openBeside = () => { openPane(note.id); };

  return { fetcher, pickerOpen, setPickerOpen, applySelection, refresh, openBeside };
};
