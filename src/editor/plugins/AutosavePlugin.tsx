import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { serializeState } from '../serialize';

interface AutosavePluginProps {
  onChange: (serialized: string) => void;
  debounceMs?: number;
}

export const AutosavePlugin = ({ onChange, debounceMs = 600 }: AutosavePluginProps) => {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const serialized = serializeState(editorState);
        if (serialized === lastSavedRef.current) return;
        lastSavedRef.current = serialized;
        onChange(serialized);
      }, debounceMs);
    });
  }, [editor, onChange, debounceMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
};
