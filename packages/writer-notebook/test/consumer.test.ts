import { describe, expect, it } from 'vitest';
import {
  createNotebookSdk,
  type Notebook,
  type NotebookAsset,
  type NotebookPage,
  type NotebookStore,
} from '../src/core/index';

class MemoryNotebookStore implements NotebookStore {
  readonly notebooks = new Map<string, Notebook>();
  readonly pages = new Map<string, NotebookPage>();
  readonly assets = new Map<string, NotebookAsset>();

  listNotebooks = async (): Promise<readonly Notebook[]> => [...this.notebooks.values()];
  getNotebook = async (id: string): Promise<Notebook | undefined> => this.notebooks.get(id);
  listPages = async (notebookId: string): Promise<readonly NotebookPage[]> =>
    [...this.pages.values()].filter((page) => page.notebookId === notebookId);
  getPage = async (id: string): Promise<NotebookPage | undefined> => this.pages.get(id);
  getAsset = async (id: string): Promise<NotebookAsset | undefined> => this.assets.get(id);
  insertNotebook = async (value: Notebook): Promise<void> => {
    this.notebooks.set(value.id, value);
  };
  updateNotebook = this.insertNotebook;
  insertPageBundle = async (
    page: NotebookPage,
    assets: readonly NotebookAsset[],
  ): Promise<void> => {
    this.pages.set(page.id, page);
    for (const asset of assets) this.assets.set(asset.id, asset);
  };
  attachVector = async (page: NotebookPage, asset: NotebookAsset): Promise<void> => {
    this.pages.set(page.id, page);
    this.assets.set(asset.id, asset);
  };
  replacePageOrder = async (pages: readonly NotebookPage[]): Promise<void> => {
    for (const page of pages) this.pages.set(page.id, page);
  };
  deletePageBundle = async (pageId: string): Promise<void> => {
    const page = this.pages.get(pageId);
    this.pages.delete(pageId);
    if (!page) return;
    for (const asset of this.assets.values()) {
      if (asset.pageId === pageId) this.assets.delete(asset.id);
    }
  };
  deleteNotebookTree = async (notebookId: string): Promise<void> => {
    this.notebooks.delete(notebookId);
    const ids = [...this.pages.values()]
      .filter((page) => page.notebookId === notebookId)
      .map(({ id }) => id);
    for (const id of ids) await this.deletePageBundle(id);
  };
}

describe('a consumer outside Writer', () => {
  it('manages a notebook through the portable store contract', async () => {
    const store = new MemoryNotebookStore();
    let id = 0;
    let now = 1000;
    const sdk = createNotebookSdk({
      store,
      ids: { next: () => `id-${++id}` },
      clock: { now: () => ++now },
    });

    const notebook = await sdk.createNotebook('Field notes');
    const page = await sdk.addPage({
      notebookId: notebook.id,
      source: { blob: new Blob(['source'], { type: 'image/png' }), mime: 'image/png' },
      thumbnail: { blob: new Blob(['thumb'], { type: 'image/webp' }), mime: 'image/webp' },
      width: 1200,
      height: 1600,
    });
    await sdk.rotatePage(page.id, 90);

    expect((await sdk.listNotebooks()).map(({ title }) => title)).toEqual(['Field notes']);
    expect((await sdk.listPages(notebook.id))[0]?.rotation).toBe(90);
    expect(await store.getAsset(page.sourceAssetId)).toMatchObject({ kind: 'source' });
  });
});
