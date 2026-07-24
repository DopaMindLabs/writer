import { useEffect, useState, type KeyboardEvent } from 'react';
import type { InlineRename } from './Sidebar.types';

export const useInlineRename = (
  current: string,
  save: (next: string) => Promise<void>,
): InlineRename => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);

  useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === current) return;
    await save(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(current);
      setEditing(false);
    }
  };

  return {
    editing,
    draft,
    setDraft,
    beginEdit: () => { setEditing(true); },
    commit,
    onKeyDown,
  };
};
