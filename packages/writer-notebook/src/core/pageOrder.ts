import type { NotebookPage } from './notebook.types';

const comparePages = (left: NotebookPage, right: NotebookPage): number => {
  const orderDifference = left.order - right.order;
  return orderDifference === 0 ? left.id.localeCompare(right.id) : orderDifference;
};

export const sortPages = (pages: readonly NotebookPage[]): readonly NotebookPage[] =>
  [...pages].sort(comparePages);

const assertDestination = (length: number, destination: number): void => {
  if (!Number.isInteger(destination) || destination < 0 || destination >= length) {
    throw new RangeError('Page position is outside the notebook');
  }
};

export const movePage = (
  pages: readonly NotebookPage[],
  pageId: string,
  destination: number,
): readonly NotebookPage[] => {
  assertDestination(pages.length, destination);
  const sorted = sortPages(pages);
  const moving = sorted.find(({ id }) => id === pageId);
  if (!moving) throw new Error(`Unknown page: ${pageId}`);
  const withoutMoving = sorted.filter(({ id }) => id !== pageId);
  const ordered = [
    ...withoutMoving.slice(0, destination),
    moving,
    ...withoutMoving.slice(destination),
  ];
  return ordered.map((page, order) => ({ ...page, order }));
};
