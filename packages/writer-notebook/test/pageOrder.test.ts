import { describe, expect, it } from 'vitest';
import { movePage, sortPages, type NotebookPage } from '../src/core/index';

const page = (id: string, order: number): NotebookPage => ({
  id,
  notebookId: 'notebook-1',
  order,
  sourceAssetId: `source-${id}`,
  thumbnailAssetId: `thumbnail-${id}`,
  width: 1200,
  height: 1600,
  rotation: 0,
  createdAt: 100,
  updatedAt: 100,
});

describe('page ordering', () => {
  it('sorts duplicate positions deterministically by id', () => {
    expect(sortPages([page('c', 1), page('b', 0), page('a', 1)]).map(({ id }) => id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('moves a page and rewrites a dense sequence without mutating input', () => {
    const input = [page('a', 0), page('b', 1), page('c', 2)];
    const output = movePage(input, 'c', 0);

    expect(output.map(({ id, order }) => [id, order])).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
    expect(input.map(({ id, order }) => [id, order])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ]);
  });

  it('rejects an unknown page or out-of-range destination', () => {
    expect(() => movePage([page('a', 0)], 'missing', 0)).toThrow('Unknown page');
    expect(() => movePage([page('a', 0)], 'a', 1)).toThrow('Page position');
  });
});
