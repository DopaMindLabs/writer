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

    // Re-opening with LoremDB triggers all upgrade paths through v5.
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
      // state intentionally omitted to exercise the v4 upgrade
    });
    await v3.close();

    const upgraded = new LoremDB(dbName);
    await upgraded.open();
    const note = await upgraded.notes.get('n-legacy');
    expect(note).toBeDefined();
    expect(note?.state).toBe('user');
    await upgraded.close();
  });
});
