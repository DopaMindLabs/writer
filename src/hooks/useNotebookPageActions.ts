import { useState } from 'react';
import type { NotebookPage, PageRotation } from 'writer-notebook/core';
import { errorMessage } from '@/lib/errorMessage';
import { createWriterNotebookSdk } from '@/lib/writerNotebookIntegration';

interface NotebookPageActionOptions {
  readonly spaceId: string;
  readonly pages: readonly NotebookPage[];
  readonly selected: NotebookPage | undefined;
  readonly selectPage: (pageId: string) => void;
}

const ROTATIONS: readonly PageRotation[] = [0, 90, 180, 270];
const nextRotation = (rotation: PageRotation): PageRotation =>
  ROTATIONS[(ROTATIONS.indexOf(rotation) + 1) % ROTATIONS.length];
const pageAt = (pages: readonly NotebookPage[], index: number): NotebookPage | undefined =>
  index >= 0 && index < pages.length ? pages[index] : undefined;

export const useNotebookPageActions = (options: NotebookPageActionOptions) => {
  const [error, setError] = useState<string | null>(null);
  const [focusPageId, setFocusPageId] = useState<string | null>(null);
  const [focusAddAction, setFocusAddAction] = useState(false);
  const sdk = createWriterNotebookSdk(options.spaceId);
  const selected = options.selected;
  const index = selected ? options.pages.findIndex(({ id }) => id === selected.id) : -1;

  const run = (operation: () => Promise<void>): void => {
    setError(null);
    void operation().catch((cause: unknown) => { setError(errorMessage(cause)); });
  };
  const selectIndex = (targetIndex: number): void => {
    const target = pageAt(options.pages, targetIndex);
    if (!target) return;
    setFocusPageId(null);
    setFocusAddAction(false);
    options.selectPage(target.id);
  };
  const rotate = (): void => {
    if (!selected) return;
    run(async () => { await sdk.rotatePage(selected.id, nextRotation(selected.rotation)); });
  };
  const move = (destination: number): void => {
    if (!selected) return;
    run(async () => { await sdk.movePage(selected.id, destination); });
  };
  const deletePage = (): void => {
    if (!selected) return;
    const currentId = selected.id;
    const fallback = pageAt(options.pages, index + 1) ?? pageAt(options.pages, index - 1);
    run(async () => {
      await sdk.deletePage(currentId);
      if (fallback) {
        setFocusPageId(fallback.id);
        options.selectPage(fallback.id);
      } else {
        setFocusPageId(null);
        setFocusAddAction(true);
      }
    });
  };
  return {
    error, focusPageId, focusAddAction: focusAddAction && options.pages.length === 0,
    canMoveEarlier: index > 0, canMoveLater: index >= 0 && index < options.pages.length - 1,
    previous: () => { selectIndex(index - 1); }, next: () => { selectIndex(index + 1); }, rotate,
    moveEarlier: () => { move(index - 1); }, moveLater: () => { move(index + 1); }, deletePage,
  };
};
