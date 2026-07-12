import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { EditorState } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeState } from '@/editor/serialize';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';

interface AutosavePluginProps {
  onChange: (serialized: string) => Promise<void>;
  debounceMs?: number;
  /** Exposes the pending-save flush so the editor handle can drive it on demand. */
  flushRef?: RefObject<() => Promise<FlushResult>>;
  /**
   * The body already persisted for this document when the editor mounts (the
   * `docs.body` the CRDT seed was built from, after any pre-mount reconciliation).
   * It initialises the save baseline so a flush of the freshly-seeded editor —
   * before the user has typed anything — dedupes to {@link NO_FLUSH} instead of
   * reporting the seed as unsaved local work. Without it a clean mounted editor
   * looks dirty to cloud reconciliation, which then keeps the stale local body
   * and demotes the pulled remote body to a revision. Captured once at mount, so
   * a later `docs.body` change does not move the baseline out from under a stale
   * CRDT.
   */
  persistedBody?: string;
}

export const AutosavePlugin = ({
  onChange,
  debounceMs = 600,
  flushRef,
  persistedBody,
}: AutosavePluginProps) => {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backstopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(persistedBody ?? null);
  const latestStateRef = useRef<EditorState | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Flush any pending save, resolving once the write lands with which body (if
  // any) was persisted — the signal cloud reconciliation awaits to tell
  // same-device autosave lag from a genuine remote pull without losing content.
  const flushPendingSave = useCallback(async (): Promise<FlushResult> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (backstopRef.current) {
      clearTimeout(backstopRef.current);
      backstopRef.current = null;
    }
    const state = latestStateRef.current;
    if (!state) return NO_FLUSH;
    const serialized = serializeState(state);
    if (serialized === lastSavedRef.current) return NO_FLUSH;
    // Record the save optimistically so a concurrent flush of the same content
    // dedupes, but roll back on a rejected write so the edit stays pending (its
    // serialized form again differs from lastSavedRef) and a later flush retries
    // it rather than silently dropping it.
    const previous = lastSavedRef.current;
    lastSavedRef.current = serialized;
    try {
      await onChangeRef.current(serialized);
    } catch (error) {
      lastSavedRef.current = previous;
      throw error;
    }
    return { persisted: true, body: serialized };
  }, []);

  // Fire the flush from a timer/unmount without leaving an unhandled rejection.
  const flushInBackground = useCallback((): void => {
    void flushPendingSave().catch((error: unknown) => {
      console.error('autosave flush failed', error);
    });
  }, [flushPendingSave]);

  useEffect(() => {
    const ref = flushRef;
    if (!ref) return;
    ref.current = flushPendingSave;
    return () => {
      ref.current = () => Promise.resolve(NO_FLUSH);
    };
  }, [flushRef, flushPendingSave]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        latestStateRef.current = editorState;
        if (tags.has('collaboration')) {
          // Remote-applied state is not ours to persist on the primary debounce.
          // But update tags are per-reconciliation, so a coalesced local edit can
          // ride inside a collaboration flush; a bounded-staleness backstop (twice
          // the debounce) catches it without resetting a pending local save. The
          // lastSavedRef dedupe below means a purely-remote flush costs nothing.
          if (!timerRef.current) {
            backstopRef.current ??= setTimeout(flushInBackground, debounceMs * 2);
          }
          return;
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flushInBackground, debounceMs);
      },
    );
  }, [editor, debounceMs, flushInBackground]);

  useEffect(() => {
    return () => {
      flushInBackground();
    };
  }, [flushInBackground]);

  return null;
};
