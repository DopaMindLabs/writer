import { DEFAULT_NOTEBOOK_LIMITS, type NotebookLimits } from './limits';
import type {
  AddPageInput,
  AttachVectorInput,
  Notebook,
  NotebookAsset,
  NotebookAssetInput,
  NotebookPage,
  PageRotation,
} from './notebook.types';
import type { NotebookClock, NotebookIdSource, NotebookStore } from './notebookStore';
import { movePage, sortPages } from './pageOrder';
import { SAFE_VECTOR_DOCUMENT_MIME } from './safeVectorSerialisation';

export interface NotebookSdkOptions {
  readonly store: NotebookStore;
  readonly ids: NotebookIdSource;
  readonly clock: NotebookClock;
  readonly limits?: Partial<NotebookLimits>;
}

export interface NotebookSdk {
  listNotebooks(): Promise<readonly Notebook[]>;
  listPages(notebookId: string): Promise<readonly NotebookPage[]>;
  createNotebook(title: string): Promise<Notebook>;
  renameNotebook(id: string, title: string): Promise<Notebook>;
  addPage(input: AddPageInput): Promise<NotebookPage>;
  attachVector(input: AttachVectorInput): Promise<NotebookPage>;
  rotatePage(pageId: string, rotation: PageRotation): Promise<NotebookPage>;
  movePage(pageId: string, destination: number): Promise<readonly NotebookPage[]>;
  deletePage(pageId: string): Promise<void>;
  deleteNotebook(notebookId: string): Promise<void>;
}

const resolveLimits = (overrides?: Partial<NotebookLimits>): NotebookLimits => ({
  ...DEFAULT_NOTEBOOK_LIMITS,
  ...overrides,
  safeVector: { ...DEFAULT_NOTEBOOK_LIMITS.safeVector, ...overrides?.safeVector },
});

const validTitle = (title: string, limits: NotebookLimits): string => {
  const trimmed = title.trim();
  if (trimmed.length === 0 || trimmed.length > limits.maxTitleLength) {
    throw new RangeError('Notebook title is outside the allowed length');
  }
  return trimmed;
};

const assertAsset = (
  input: NotebookAssetInput,
  maximum: number,
  kind: NotebookAsset['kind'],
): void => {
  const expectedMime = kind === 'vector' ? SAFE_VECTOR_DOCUMENT_MIME : 'image/';
  const supported =
    input.mime === input.blob.type &&
    (kind === 'vector' ? input.mime === expectedMime : input.mime.startsWith(expectedMime));
  if (!supported) {
    throw new TypeError(`${kind} asset MIME does not match its Blob`);
  }
  if (input.blob.size <= 0 || input.blob.size > maximum) {
    throw new RangeError(`${kind} asset exceeds the configured byte limit`);
  }
};

const makeAsset = (options: {
  readonly input: NotebookAssetInput;
  readonly id: string;
  readonly notebookId: string;
  readonly pageId: string;
  readonly kind: NotebookAsset['kind'];
  readonly createdAt: number;
}): NotebookAsset => ({
  id: options.id,
  notebookId: options.notebookId,
  pageId: options.pageId,
  kind: options.kind,
  mime: options.input.mime,
  size: options.input.blob.size,
  blob: options.input.blob,
  createdAt: options.createdAt,
});

const assertDimensions = (input: AddPageInput, limits: NotebookLimits): void => {
  const pixels = input.width * input.height;
  const withinDimensions =
    Number.isFinite(input.width) &&
    Number.isFinite(input.height) &&
    input.width > 0 &&
    input.height > 0 &&
    input.width <= limits.maxImageDimension &&
    input.height <= limits.maxImageDimension;
  if (!withinDimensions || pixels > limits.maxDecodedPixels) {
    throw new RangeError('Page dimensions exceed the configured image limit');
  }
};

const requireNotebook = async (store: NotebookStore, id: string): Promise<Notebook> => {
  const notebook = await store.getNotebook(id);
  if (!notebook) throw new Error(`Unknown notebook: ${id}`);
  return notebook;
};

const requirePage = async (store: NotebookStore, id: string): Promise<NotebookPage> => {
  const page = await store.getPage(id);
  if (!page) throw new Error(`Unknown page: ${id}`);
  return page;
};

const createNotebookSdkInternal = (options: NotebookSdkOptions, limits: NotebookLimits): NotebookSdk => ({
  listNotebooks: () => options.store.listNotebooks(),
  listPages: async (notebookId) => sortPages(await options.store.listPages(notebookId)),
  createNotebook: async (title) => {
    const now = options.clock.now();
    const notebook = { id: options.ids.next(), title: validTitle(title, limits), createdAt: now, updatedAt: now };
    await options.store.insertNotebook(notebook);
    return notebook;
  },
  renameNotebook: async (id, title) => {
    const current = await requireNotebook(options.store, id);
    const notebook = { ...current, title: validTitle(title, limits), updatedAt: options.clock.now() };
    await options.store.updateNotebook(notebook);
    return notebook;
  },
  addPage: async (input) => addPage(options, limits, input),
  attachVector: async (input) => attachVector(options, limits, input),
  rotatePage: async (pageId, rotation) => rotatePage(options, pageId, rotation),
  movePage: async (pageId, destination) => moveStoredPage(options, pageId, destination),
  deletePage: (pageId) => options.store.deletePageBundle(pageId),
  deleteNotebook: (notebookId) => options.store.deleteNotebookTree(notebookId),
});

const addPage = async (
  options: NotebookSdkOptions,
  limits: NotebookLimits,
  input: AddPageInput,
): Promise<NotebookPage> => {
  await requireNotebook(options.store, input.notebookId);
  const existing = await options.store.listPages(input.notebookId);
  if (existing.length >= limits.maxPagesPerNotebook) throw new RangeError('Notebook page limit reached');
  assertDimensions(input, limits);
  assertAsset(input.source, limits.maxSourceBytes, 'source');
  assertAsset(input.thumbnail, limits.maxThumbnailBytes, 'thumbnail');
  const now = options.clock.now();
  const pageId = options.ids.next();
  const sourceId = options.ids.next();
  const thumbnailId = options.ids.next();
  const page: NotebookPage = {
    id: pageId, notebookId: input.notebookId, order: existing.length,
    sourceAssetId: sourceId, thumbnailAssetId: thumbnailId, width: input.width,
    height: input.height, rotation: 0, createdAt: now, updatedAt: now,
  };
  const source = makeAsset({ input: input.source, id: sourceId, notebookId: input.notebookId, pageId, kind: 'source', createdAt: now });
  const thumbnail = makeAsset({ input: input.thumbnail, id: thumbnailId, notebookId: input.notebookId, pageId, kind: 'thumbnail', createdAt: now });
  await options.store.insertPageBundle(page, [source, thumbnail]);
  return page;
};

const attachVector = async (
  options: NotebookSdkOptions,
  limits: NotebookLimits,
  input: AttachVectorInput,
): Promise<NotebookPage> => {
  const current = await requirePage(options.store, input.pageId);
  assertAsset(input.vector, limits.maxVectorBytes, 'vector');
  const now = options.clock.now();
  const assetId = current.vectorAssetId ?? options.ids.next();
  const page: NotebookPage = { ...current, vectorAssetId: assetId, vectorisation: input.vectorisation, updatedAt: now };
  const asset = makeAsset({ input: input.vector, id: assetId, notebookId: current.notebookId, pageId: current.id, kind: 'vector', createdAt: now });
  await options.store.attachVector(page, asset);
  return page;
};

const rotatePage = async (
  options: NotebookSdkOptions,
  pageId: string,
  rotation: PageRotation,
): Promise<NotebookPage> => {
  const current = await requirePage(options.store, pageId);
  const page = { ...current, rotation, updatedAt: options.clock.now() };
  await options.store.replacePageOrder([page]);
  return page;
};

const moveStoredPage = async (
  options: NotebookSdkOptions,
  pageId: string,
  destination: number,
): Promise<readonly NotebookPage[]> => {
  const current = await requirePage(options.store, pageId);
  const pages = await options.store.listPages(current.notebookId);
  const moved = movePage(pages, pageId, destination);
  const now = options.clock.now();
  const stamped = moved.map((page) => {
    const prior = pages.find(({ id }) => id === page.id);
    return prior?.order === page.order ? page : { ...page, updatedAt: now };
  });
  await options.store.replacePageOrder(stamped);
  return stamped;
};

export const createNotebookSdk = (options: NotebookSdkOptions): NotebookSdk =>
  createNotebookSdkInternal(options, resolveLimits(options.limits));
