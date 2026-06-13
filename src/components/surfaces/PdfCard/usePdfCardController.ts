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
    if (!note.pdfUrl) return;
    if (cache?.url === note.pdfUrl) return;
    if (fetcher.status.kind !== 'idle') return;
    if (lastTriedRef.current === note.pdfUrl) return;
    lastTriedRef.current = note.pdfUrl;
    void fetcher.run(note.pdfUrl);
  }, [note.pdfUrl, cache, fetcher]);
};

export interface CardController {
  fetcher: ReturnType<typeof useFetchPdf>;
  editingUrl: boolean;
  setEditingUrl: (v: boolean) => void;
  submitUrl: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
  openBeside: () => void;
}

export const useCardController = (note: Note): CardController => {
  const openPane = useUI((s) => s.openMediaReadingPaneForNote);
  const fetcher = useFetchPdf(note.id);
  const [editingUrl, setEditingUrl] = useState(false);

  const submitUrl = async (url: string) => {
    if (url.length === 0) return;
    await invalidateUrlCache(note.id);
    if (note.pdfUrl !== url) {
      await db.notes.update(note.id, { pdfUrl: url });
    }
    setEditingUrl(false);
    await fetcher.run(url);
  };

  const refresh = async () => {
    if (!note.pdfUrl) return;
    await invalidateUrlCache(note.id);
    await fetcher.run(note.pdfUrl);
  };

  const openBeside = () => { openPane(note.id); };

  return { fetcher, editingUrl, setEditingUrl, submitUrl, refresh, openBeside };
};
