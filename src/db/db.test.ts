import Dexie from 'dexie';
import { LoremDB } from './db';

describe('LoremDB migrations', () => {
  let dbName: string;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('version(2) upgrade backfills sections.parentSectionId = null when missing', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v1 = new Dexie(dbName);
    v1.version(1).stores({
      spaces: 'id, updatedAt',
      sections: 'id, spaceId, order, [spaceId+order]',
      docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
      notes: 'id, spaceId, kind, createdAt',
      annotations: 'id, docId, kind, createdAt',
      citations: 'id, spaceId, year, [spaceId+key]',
      backups: 'id, when, scope, kind',
      settings: 'key',
      palettes: 'id, spaceId',
      meta: 'key',
    });
    await v1.open();
    await v1.table('sections').add({
      id: 'sec-legacy',
      spaceId: 's1',
      label: 'Legacy',
      order: 0,
    });
    await v1.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    const sec = await upgraded.sections.get('sec-legacy');
    expect(sec).toBeDefined();
    expect(sec?.parentSectionId).toBeNull();
    await upgraded.close();
  });

  it('version(4) upgrade backfills notes.state = "user" when missing', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v3 = new Dexie(dbName);
    v3.version(1).stores({
      spaces: 'id, updatedAt',
      sections: 'id, spaceId, order, [spaceId+order]',
      docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
      notes: 'id, spaceId, kind, createdAt',
      annotations: 'id, docId, kind, createdAt',
      citations: 'id, spaceId, year, [spaceId+key]',
      backups: 'id, when, scope, kind',
      settings: 'key',
      palettes: 'id, spaceId',
      meta: 'key',
    });
    v3.version(2).stores({
      sections:
        'id, spaceId, parentSectionId, order, [spaceId+order], [spaceId+parentSectionId]',
    });
    v3.version(3).stores({
      connections:
        'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
    });
    await v3.open();
    await v3.table('notes').add({
      id: 'n-legacy',
      spaceId: 's1',
      l: 0,
      t: 0,
      w: 100,
      h: 60,
      kind: 'note',
      body: 'orig',
      createdAt: 0,
    });
    await v3.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    const note = await upgraded.notes.get('n-legacy');
    expect(note).toBeDefined();
    expect(note?.state).toBe('user');
    await upgraded.close();
  });

  it('version(7) adds the noteAttachments table without disturbing existing data', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v6 = new Dexie(dbName);
    v6.version(6).stores({
      spaces: 'id, createdAt, updatedAt',
      notes: 'id, spaceId, kind, createdAt',
      connections:
        'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
      meta: 'key',
    });
    await v6.open();
    await v6.table('notes').add({
      id: 'n-keep',
      spaceId: 's1',
      l: 0,
      t: 0,
      w: 100,
      h: 60,
      kind: 'note',
      state: 'user',
      body: 'keep me',
      createdAt: 0,
    });
    await v6.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    expect((await upgraded.notes.get('n-keep'))?.body).toBe('keep me');
    await upgraded.noteAttachments.add({
      id: 'att1',
      noteId: 'n-keep',
      spaceId: 's1',
      name: 'a.png',
      mime: 'image/png',
      size: 1,
      blob: new Blob(['x']),
      createdAt: 1,
    });
    expect(
      await upgraded.noteAttachments.where('noteId').equals('n-keep').count(),
    ).toBe(1);
    await upgraded.close();
  });

  it('version(9) adds the docInspectorConfigs table without disturbing existing data', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v8 = new Dexie(dbName);
    v8.version(8).stores({
      docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
      revisions: 'id, docId, createdAt, kind, [docId+createdAt]',
      meta: 'key',
    });
    await v8.open();
    await v8.table('docs').add({
      id: 'd-keep',
      spaceId: 's1',
      sectionId: 'sec1',
      name: 'Keep',
      body: 'keep me',
      meta: { wordCount: 2 },
      updatedAt: 0,
    });
    await v8.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    expect((await upgraded.docs.get('d-keep'))?.body).toBe('keep me');
    await upgraded.docInspectorConfigs.add({
      spaceId: 'global',
      wordLimit: 'on',
      charLimit: 'on',
      status: 'on',
      dueDate: 'on',
      highlightOverLimit: 'on',
    });
    expect((await upgraded.docInspectorConfigs.get('global'))?.status).toBe(
      'on',
    );
    await upgraded.close();
  });

  it('version(12) adds media and trustedDomains tables and mediaItemId index without disturbing notes', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v11 = new Dexie(dbName);
    v11.version(11).stores({
      notes: 'id, spaceId, kind, pdfUrl, createdAt',
      noteUrlCache: 'noteId, fetchedAt',
      meta: 'key',
    });
    await v11.open();
    await v11.table('notes').add({
      id: 'n-keep',
      spaceId: 's1',
      l: 0,
      t: 0,
      w: 100,
      h: 60,
      kind: 'pdf',
      state: 'user',
      body: 'keep me',
      createdAt: 0,
    });
    await v11.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    expect((await upgraded.notes.get('n-keep'))?.body).toBe('keep me');

    await upgraded.media.add({
      id: 'm1',
      spaceId: 's1',
      name: 'paper.pdf',
      mime: 'application/pdf',
      size: 1,
      blob: new Blob(['%PDF']),
      pageCount: 3,
      createdAt: 1,
      updatedAt: 1,
    });
    expect(
      await upgraded.media.where('spaceId').equals('s1').count(),
    ).toBe(1);

    await upgraded.trustedDomains.add({ domain: 'arxiv.org', addedAt: 2 });
    expect((await upgraded.trustedDomains.get('arxiv.org'))?.addedAt).toBe(2);

    await upgraded.notes.update('n-keep', { mediaItemId: 'm1' });
    const linked = await upgraded.notes
      .where('mediaItemId')
      .equals('m1')
      .toArray();
    expect(linked.map((n) => n.id)).toEqual(['n-keep']);
    await upgraded.close();
  });

  it('version(10) adds the [spaceId+year] citation index without disturbing rows', async () => {
    dbName = `lipsum-migration-${crypto.randomUUID()}`;
    const v9 = new Dexie(dbName);
    v9.version(9).stores({
      citations: 'id, spaceId, year, [spaceId+key]',
    });
    await v9.open();
    await v9.table('citations').bulkAdd([
      { id: 'c-new', spaceId: 's1', key: 'new', authors: 'A', title: 'T', year: 2020, type: 'misc', useCount: 0 },
      { id: 'c-old', spaceId: 's1', key: 'old', authors: 'B', title: 'U', year: 1995, type: 'misc', useCount: 0 },
      { id: 'c-other', spaceId: 's2', key: 'x', authors: 'C', title: 'V', year: 2000, type: 'misc', useCount: 0 },
    ]);
    await v9.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    const ordered = await upgraded.citations
      .where('[spaceId+year]')
      .between(['s1', Dexie.minKey], ['s1', Dexie.maxKey])
      .toArray();
    expect(ordered.map((c) => c.id)).toEqual(['c-old', 'c-new']);
    await upgraded.close();
  });
});
