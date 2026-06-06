import { useCallback, useEffect, useRef } from 'react';
import type { EditorState } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeState } from '@/editor/serialize';

interface AutosavePluginProps {
  onChange: (serialized: string) => void;
  debounceMs?: number;
}

export const AutosavePlugin = ({ onChange, debounceMs = 600 }: AutosavePluginProps) => {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  // Most recent dirty editor state, captured by the update listener. The unmount
  // flush serializes this so the user's last edit is never dropped when they
  // navigate away inside the debounce window.
  const latestStateRef = useRef<EditorState | null>(null);
  // Keep the latest onChange reachable from the stable flush helper without
  // re-subscribing the update listener on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const flushPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const state = latestStateRef.current;
    if (!state) return;
    const serialized = serializeState(state);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    onChangeRef.current(serialized);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      latestStateRef.current = editorState;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushPendingSave, debounceMs);
    });
  }, [editor, debounceMs, flushPendingSave]);

  // On unmount, persist any edit still waiting behind the debounce instead of
  // discarding the timer.
  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  return null;
};
