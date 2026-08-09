import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { NotebookPage } from 'writer-notebook/core';

export const useNotebookPageSelection = <TPage extends NotebookPage>(pages: readonly TPage[]) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get('page');
  const firstPage = pages.length > 0 ? pages[0] : undefined;
  const selected: TPage | undefined = pages.find(({ id }) => id === requestedId) ?? firstPage;

  useEffect(() => {
    const selectedId = selected?.id ?? null;
    if (requestedId === selectedId) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (selectedId) next.set('page', selectedId);
      else next.delete('page');
      return next;
    }, { replace: true });
  }, [requestedId, selected?.id, setSearchParams]);

  const selectPage = (pageId: string): void => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', pageId);
      return next;
    });
  };

  return { selected, selectPage };
};
