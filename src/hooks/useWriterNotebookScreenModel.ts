import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { WriterNotebook, WriterNotebookAsset, WriterNotebookPage } from '@/db/schema';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { WRITER_NOTEBOOK_LIMITS } from '@/lib/writerNotebookIntegration';
import { useNotebookPageImport } from './useNotebookPageImport';
import { useNotebookPageActions } from './useNotebookPageActions';
import { useNotebookPageSelection } from './useNotebookPageSelection';
import { useWriterNotebookAssets, useWriterNotebookPages } from './useWriterNotebookPages';
import { useWriterNotebooks } from './useWriterNotebooks';

interface RouteStateInput {
  readonly spaceId: string | undefined;
  readonly notebookId: string | undefined;
  readonly notebooks: readonly WriterNotebook[] | undefined;
  readonly assets: readonly WriterNotebookAsset[] | undefined;
}

const resolveRouteState = (input: RouteStateInput) => {
  if (!input.spaceId || !input.notebookId) return { kind: 'invalid' } as const;
  if (input.notebooks === undefined || input.assets === undefined) return { kind: 'loading' } as const;
  const notebook = input.notebooks.find(({ id }) => id === input.notebookId);
  if (!notebook) return { kind: 'not-found', spaceId: input.spaceId } as const;
  return { kind: 'ready', spaceId: input.spaceId, notebook, assets: input.assets } as const;
};

export const useWriterNotebookScreenModel = () => {
  const { spaceId, notebookId } = useParams<{ spaceId: string; notebookId: string }>();
  const space = useSpace(spaceId);
  const notebooks = useWriterNotebooks(spaceId);
  const pagesQuery = useWriterNotebookPages(spaceId, notebookId);
  const assets = useWriterNotebookAssets(spaceId, notebookId);
  const pages: readonly WriterNotebookPage[] = pagesQuery ?? [];
  const selection = useNotebookPageSelection(pages);
  const importer = useNotebookPageImport(spaceId ?? '', notebookId ?? '');
  const actions = useNotebookPageActions({
    spaceId: spaceId ?? '', pages, selected: selection.selected, selectPage: selection.selectPage,
  });
  const lastDocId = useUI((state) => state.currentDocId);
  const setCurrentSpaceId = useUI((state) => state.setCurrentSpaceId);
  const route = resolveRouteState({ spaceId, notebookId, notebooks, assets });

  useEffect(() => { if (spaceId) setCurrentSpaceId(spaceId); }, [spaceId, setCurrentSpaceId]);

  if (route.kind !== 'ready') return route;
  const selected = selection.selected;
  const pageIndex = selected ? pages.findIndex(({ id }) => id === selected.id) : -1;
  const source: WriterNotebookAsset | undefined = selected
    ? route.assets.find(({ id }) => id === selected.sourceAssetId)
    : undefined;
  const vector = selected?.vectorAssetId
    ? route.assets.find(({ id }) => id === selected.vectorAssetId)
    : undefined;
  return {
    kind: 'ready', spaceId: route.spaceId, space, notebook: route.notebook, pages,
    assets: route.assets, selection, importer, actions, lastDocId,
    source, vector, pageIndex,
    atPageLimit: pages.length >= WRITER_NOTEBOOK_LIMITS.maxPagesPerNotebook,
  } as const;
};
