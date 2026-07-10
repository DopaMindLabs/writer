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
  const latestStateRef = useRef<EditorState | null>(null);
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

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  return null;
};
