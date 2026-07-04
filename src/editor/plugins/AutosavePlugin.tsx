import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { EditorState } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeState } from '@/editor/serialize';

interface AutosavePluginProps {
  onChange: (serialized: string) => void;
  debounceMs?: number;
  /** Exposes the pending-save flush so the editor handle can drive it on demand. */
  flushRef?: RefObject<() => boolean>;
}

export const AutosavePlugin = ({
  onChange,
  debounceMs = 600,
  flushRef,
}: AutosavePluginProps) => {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backstopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const latestStateRef = useRef<EditorState | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Flush any pending save synchronously; return whether unsaved edits were
  // written — the signal cloud reconciliation uses to tell same-device autosave
  // lag from a genuine remote pull.
  const flushPendingSave = useCallback((): boolean => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (backstopRef.current) {
      clearTimeout(backstopRef.current);
      backstopRef.current = null;
    }
    const state = latestStateRef.current;
    if (!state) return false;
    const serialized = serializeState(state);
    if (serialized === lastSavedRef.current) return false;
    lastSavedRef.current = serialized;
    onChangeRef.current(serialized);
    return true;
  }, []);

  useEffect(() => {
    const ref = flushRef;
    if (!ref) return;
    ref.current = flushPendingSave;
    return () => {
      ref.current = () => false;
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
            backstopRef.current ??= setTimeout(flushPendingSave, debounceMs * 2);
          }
          return;
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flushPendingSave, debounceMs);
      },
    );
  }, [editor, debounceMs, flushPendingSave]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  return null;
};
