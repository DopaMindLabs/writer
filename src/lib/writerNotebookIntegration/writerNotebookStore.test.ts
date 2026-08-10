import { afterEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { createNotebookSdk } from 'writer-notebook/core';
import { createWriterNotebookStore } from './writerNotebookStore';

const makeSdk = (database: LoremDB, spaceId: string) => {
  let id = 0;
  let now = 100;
  return createNotebookSdk({
    store: createWriterNotebookStore(spaceId, database),
    ids: { next: () => `id-${String(++id)}` },
    clock: { now: () => ++now },
  });
};

const databases: LoremDB[] = [];

const makeDb = (): LoremDB => {
  const database = new LoremDB(`writer-notebook-store-${String(databases.length)}`);
  databases.push(database);
  return database;
};

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe('Writer notebook store', () => {
  it('stamps portable notebook rows with Writer space and replication metadata', async () => {
    const database = makeDb();
    const sdk = makeSdk(database, 'space-a');

    const notebook = await sdk.createNotebook('Field notes');
    const page = await sdk.addPage({
      notebookId: notebook.id,
      source: { blob: new Blob(['source'], { type: 'image/webp' }), mime: 'image/webp' },
      thumbnail: { blob: new Blob(['thumb'], { type: 'image/webp' }), mime: 'image/webp' },
      width: 800,
      height: 1200,
    });

    expect(await database.writerNotebooks.get(notebook.id)).toMatchObject({
      id: notebook.id,
      spaceId: 'space-a',
      accessScopeId: 'space-a',
    });
    expect(await database.writerNotebookPages.get(page.id)).toMatchObject({
      id: page.id,
      spaceId: 'space-a',
      notebookId: notebook.id,
    });
    expect(await database.writerNotebookAssets.where('notebookId').equals(notebook.id).count()).toBe(2);
  });

  it('never exposes a notebook through a different space-scoped adapter', async () => {
    const database = makeDb();
    const owner = makeSdk(database, 'space-a');
    const foreignStore = createWriterNotebookStore('space-b', database);
    const notebook = await owner.createNotebook('Private field notes');

    await expect(foreignStore.getNotebook(notebook.id)).resolves.toBeUndefined();
    await expect(foreignStore.listPages(notebook.id)).resolves.toEqual([]);
  });

  it('deletes one page bundle and densely renumbers the surviving pages', async () => {
    const database = makeDb();
    const sdk = makeSdk(database, 'space-a');
    const notebook = await sdk.createNotebook('Field notes');
    const addPage = () => sdk.addPage({
      notebookId: notebook.id,
      source: { blob: new Blob(['source'], { type: 'image/webp' }), mime: 'image/webp' },
      thumbnail: { blob: new Blob(['thumb'], { type: 'image/webp' }), mime: 'image/webp' },
      width: 800,
      height: 1200,
    });
    const first = await addPage();
    const second = await addPage();
    const third = await addPage();

    await sdk.deletePage(second.id);

    expect(await database.writerNotebookPages.get(second.id)).toBeUndefined();
    expect(await database.writerNotebookAssets.where('notebookId').equals(notebook.id).count()).toBe(4);
    expect((await sdk.listPages(notebook.id)).map(({ id, order }) => [id, order])).toEqual([
      [first.id, 0],
      [third.id, 1],
    ]);
  });
});
