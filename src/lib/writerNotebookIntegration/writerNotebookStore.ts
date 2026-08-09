import type { LoremDB } from '@/db/LoremDB';
import { db } from '@/db/db';
import type {
  WriterNotebook,
  WriterNotebookAsset,
  WriterNotebookPage,
} from '@/db/schema';
import {
  currentPrincipal,
  newEntityMetadata,
  touchedEntityMetadata,
} from '@/lib/writerSyncIntegration/writerEntityMetadata';
import type {
  Notebook,
  NotebookAsset,
  NotebookPage,
  NotebookStore,
} from 'writer-notebook/core';
import { WRITER_NOTEBOOK_LIMITS } from './writerNotebookLimits';

const toNotebook = (row: WriterNotebook): Notebook => ({
  id: row.id,
  title: row.title,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toPage = (row: WriterNotebookPage): NotebookPage => ({
  id: row.id,
  notebookId: row.notebookId,
  order: row.order,
  sourceAssetId: row.sourceAssetId,
  thumbnailAssetId: row.thumbnailAssetId,
  ...(row.vectorAssetId ? { vectorAssetId: row.vectorAssetId } : {}),
  width: row.width,
  height: row.height,
  rotation: row.rotation,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ...(row.vectorisation ? { vectorisation: row.vectorisation } : {}),
});

const toAsset = (row: WriterNotebookAsset): NotebookAsset => ({
  id: row.id,
  notebookId: row.notebookId,
  pageId: row.pageId,
  kind: row.kind,
  mime: row.mime,
  size: row.size,
  blob: row.blob,
  createdAt: row.createdAt,
});

const requireNotebookRow = async (
  database: LoremDB,
  spaceId: string,
  id: string,
): Promise<WriterNotebook> => {
  const row = await database.writerNotebooks.get(id);
  if (row?.spaceId !== spaceId) throw new Error(`Unknown notebook: ${id}`);
  return row;
};

const requirePageRow = async (
  database: LoremDB,
  spaceId: string,
  id: string,
): Promise<WriterNotebookPage> => {
  const row = await database.writerNotebookPages.get(id);
  if (row?.spaceId !== spaceId) throw new Error(`Unknown page: ${id}`);
  return row;
};

const assertAssetOwnership = (page: NotebookPage, assets: readonly NotebookAsset[]): void => {
  if (assets.some((asset) => asset.notebookId !== page.notebookId || asset.pageId !== page.id)) {
    throw new Error('Notebook page asset ownership does not match its page');
  }
};

const assertAggregateBytes = async (
  database: LoremDB,
  notebookId: string,
  incomingBytes: number,
  replacedAssetId?: string,
): Promise<void> => {
  const assets = await database.writerNotebookAssets.where('notebookId').equals(notebookId).toArray();
  const storedBytes = assets.reduce(
    (sum, asset) => sum + (asset.id === replacedAssetId ? 0 : asset.size),
    0,
  );
  if (storedBytes + incomingBytes > WRITER_NOTEBOOK_LIMITS.maxAggregateAssetBytes) {
    throw new RangeError('Notebook aggregate asset byte limit reached');
  }
};

const createReads = (spaceId: string, database: LoremDB) => ({
  listNotebooks: async (): Promise<readonly Notebook[]> =>
    (await database.writerNotebooks.where('spaceId').equals(spaceId).toArray()).map(toNotebook),
  getNotebook: async (id: string): Promise<Notebook | undefined> => {
    const row = await database.writerNotebooks.get(id);
    return row?.spaceId === spaceId ? toNotebook(row) : undefined;
  },
  listPages: async (notebookId: string): Promise<readonly NotebookPage[]> => {
    const notebook = await database.writerNotebooks.get(notebookId);
    if (notebook?.spaceId !== spaceId) return [];
    const rows = await database.writerNotebookPages.where('notebookId').equals(notebookId).toArray();
    return rows.filter((row) => row.spaceId === spaceId).map(toPage);
  },
  getPage: async (id: string): Promise<NotebookPage | undefined> => {
    const row = await database.writerNotebookPages.get(id);
    return row?.spaceId === spaceId ? toPage(row) : undefined;
  },
  getAsset: async (id: string): Promise<NotebookAsset | undefined> => {
    const row = await database.writerNotebookAssets.get(id);
    return row?.spaceId === spaceId ? toAsset(row) : undefined;
  },
});

const insertNotebook = async (
  spaceId: string,
  database: LoremDB,
  value: Notebook,
): Promise<void> => {
  const principal = await currentPrincipal();
  await database.writerNotebooks.add({
    ...value,
    spaceId,
    ...newEntityMetadata(spaceId, principal),
  });
};

const updateNotebook = async (
  spaceId: string,
  database: LoremDB,
  value: Notebook,
): Promise<void> => {
  const principal = await currentPrincipal();
  const current = await requireNotebookRow(database, spaceId, value.id);
  await database.writerNotebooks.put({
    ...current,
    ...value,
    ...touchedEntityMetadata(current, principal),
  });
};

const insertPageBundle = async (
  spaceId: string,
  database: LoremDB,
  page: NotebookPage,
  assets: readonly NotebookAsset[],
): Promise<void> => {
  await requireNotebookRow(database, spaceId, page.notebookId);
  assertAssetOwnership(page, assets);
  await assertAggregateBytes(database, page.notebookId, assets.reduce((sum, asset) => sum + asset.size, 0));
  const principal = await currentPrincipal();
  await database.transaction('rw', [database.writerNotebookPages, database.writerNotebookAssets], async () => {
    await database.writerNotebookPages.add({ ...page, spaceId, ...newEntityMetadata(spaceId, principal) });
    await database.writerNotebookAssets.bulkAdd(
      assets.map((asset) => ({ ...asset, spaceId, ...newEntityMetadata(spaceId, principal) })),
    );
  });
};

const attachVector = async (
  spaceId: string,
  database: LoremDB,
  page: NotebookPage,
  asset: NotebookAsset,
): Promise<void> => {
  assertAssetOwnership(page, [asset]);
  const principal = await currentPrincipal();
  await database.transaction('rw', [database.writerNotebookPages, database.writerNotebookAssets], async () => {
    const currentPage = await requirePageRow(database, spaceId, page.id);
    const currentAsset = await database.writerNotebookAssets.get(asset.id);
    if (currentAsset && currentAsset.spaceId !== spaceId) throw new Error(`Unknown asset: ${asset.id}`);
    await assertAggregateBytes(database, page.notebookId, asset.size, currentAsset?.id);
    await database.writerNotebookPages.put({
      ...currentPage,
      ...page,
      ...touchedEntityMetadata(currentPage, principal),
    });
    await database.writerNotebookAssets.put({
      ...(currentAsset ?? {}),
      ...asset,
      spaceId,
      ...(currentAsset
        ? touchedEntityMetadata(currentAsset, principal)
        : newEntityMetadata(spaceId, principal)),
    });
  });
};

const replacePageOrder = async (
  spaceId: string,
  database: LoremDB,
  pages: readonly NotebookPage[],
): Promise<void> => {
  const principal = await currentPrincipal();
  await database.transaction('rw', database.writerNotebookPages, async () => {
    const updates: WriterNotebookPage[] = [];
    for (const page of pages) {
      const current = await requirePageRow(database, spaceId, page.id);
      if (current.notebookId !== page.notebookId) throw new Error('Notebook page ownership cannot change');
      if (current.order === page.order && current.rotation === page.rotation && current.updatedAt === page.updatedAt) continue;
      updates.push({ ...current, ...page, ...touchedEntityMetadata(current, principal) });
    }
    if (updates.length > 0) await database.writerNotebookPages.bulkPut(updates);
  });
};

const deletePageBundle = async (
  spaceId: string,
  database: LoremDB,
  pageId: string,
): Promise<void> => {
  const principal = await currentPrincipal();
  await database.transaction('rw', [database.writerNotebookPages, database.writerNotebookAssets], async () => {
    const page = await requirePageRow(database, spaceId, pageId);
    const pages = await database.writerNotebookPages.where('notebookId').equals(page.notebookId).toArray();
    const assets = await database.writerNotebookAssets.where('notebookId').equals(page.notebookId).toArray();
    const assetIds = assets.filter((asset) => asset.spaceId === spaceId && asset.pageId === pageId).map(({ id }) => id);
    if (assetIds.length > 0) await database.writerNotebookAssets.bulkDelete(assetIds);
    await database.writerNotebookPages.delete(pageId);
    const survivors = pages.filter((row) => row.spaceId === spaceId && row.id !== pageId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const reordered = survivors.flatMap((row, order) =>
      row.order === order
        ? []
        : [{ ...row, order, updatedAt: Date.now(), ...touchedEntityMetadata(row, principal) }],
    );
    if (reordered.length > 0) await database.writerNotebookPages.bulkPut(reordered);
  });
};

const deleteNotebookTree = async (
  spaceId: string,
  database: LoremDB,
  notebookId: string,
): Promise<void> => {
  await database.transaction('rw', [database.writerNotebooks, database.writerNotebookPages, database.writerNotebookAssets], async () => {
    await requireNotebookRow(database, spaceId, notebookId);
    const pages = await database.writerNotebookPages.where('notebookId').equals(notebookId).toArray();
    const assets = await database.writerNotebookAssets.where('notebookId').equals(notebookId).toArray();
    const pageIds = pages.filter((row) => row.spaceId === spaceId).map(({ id }) => id);
    const assetIds = assets.filter((row) => row.spaceId === spaceId).map(({ id }) => id);
    if (assetIds.length > 0) await database.writerNotebookAssets.bulkDelete(assetIds);
    if (pageIds.length > 0) await database.writerNotebookPages.bulkDelete(pageIds);
    await database.writerNotebooks.delete(notebookId);
  });
};

export const createWriterNotebookStore = (
  spaceId: string,
  database: LoremDB = db,
): NotebookStore => ({
  ...createReads(spaceId, database),
  insertNotebook: (value) => insertNotebook(spaceId, database, value),
  updateNotebook: (value) => updateNotebook(spaceId, database, value),
  insertPageBundle: (page, assets) => insertPageBundle(spaceId, database, page, assets),
  attachVector: (page, asset) => attachVector(spaceId, database, page, asset),
  replacePageOrder: (pages) => replacePageOrder(spaceId, database, pages),
  deletePageBundle: (pageId) => deletePageBundle(spaceId, database, pageId),
  deleteNotebookTree: (notebookId) => deleteNotebookTree(spaceId, database, notebookId),
});
