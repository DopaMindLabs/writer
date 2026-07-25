import { useEffect, useState, type KeyboardEvent } from 'react';
import { errorMessage } from '@/lib/errorMessage';
import type { InlineRename } from './Sidebar.types';

/**
 * Inline-rename state machine shared by section and document rows. A commit
 * closes the editor only after the save succeeds; a failed save (e.g. the
 * reserved "Workshop" section label) keeps the editor open and exposes the
 * failure through `error` so the field can render an accessible message
 * instead of silently reverting or leaking an unhandled rejection.
 */
export const useInlineRename = (
  current: string,
  save: (next: string) => Promise<void>,
): InlineRename => {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(current);

  useEffect(() => {
    if (!editing) setDraft(current);
  }, [current, editing]);

  const commit = async (): Promise<boolean> => {
    const next = draft.trim();
    if (!next || next === current) {
      setError(null);
      setEditing(false);
      return true;
    }
    try {
      await save(next);
    } catch (err: unknown) {
      setError(errorMessage(err));
      return false;
    }
    setError(null);
    setEditing(false);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(current);
      setError(null);
      setEditing(false);
    }
  };

  return {
    editing,
    draft,
    error,
    setDraft: (next) => {
      setError(null);
      setDraft(next);
    },
    beginEdit: () => { setEditing(true); },
    commit,
    onKeyDown,
  };
};
