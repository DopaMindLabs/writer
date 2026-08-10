import type { Notebook, NotebookAsset, NotebookPage } from './notebook.types';

export interface NotebookStore {
  listNotebooks(): Promise<readonly Notebook[]>;
  getNotebook(id: string): Promise<Notebook | undefined>;
  listPages(notebookId: string): Promise<readonly NotebookPage[]>;
  getPage(id: string): Promise<NotebookPage | undefined>;
  getAsset(id: string): Promise<NotebookAsset | undefined>;
  insertNotebook(value: Notebook): Promise<void>;
  updateNotebook(value: Notebook): Promise<void>;
  insertPageBundle(page: NotebookPage, assets: readonly NotebookAsset[]): Promise<void>;
  attachVector(page: NotebookPage, asset: NotebookAsset): Promise<void>;
  replacePageOrder(pages: readonly NotebookPage[]): Promise<void>;
  deletePageBundle(pageId: string): Promise<void>;
  deleteNotebookTree(notebookId: string): Promise<void>;
}

export interface NotebookIdSource {
  next(): string;
}

export interface NotebookClock {
  now(): number;
}
