import Dexie from 'dexie';
import { describe, it, expect } from 'vitest';
import { db } from './db';
import type { DocUpdate } from './schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs/emptyBody';
import { sampleMetadata } from '@/test/fixtures';

describe('LoremDB schema', () => {
  it('declares a single schema version', () => {
    // Writer is pre-release, so every table lives in one declaration rather
    // than behind a historical version. Dexie bumps the underlying IndexedDB
    // counter itself when the physical schema changes, so a database created
    // before a table was added still opens and keeps its rows.
    expect(db.verno).toBe(1);
  });

  it('exposes every table, including docUpdates', async () => {
    await db.open();
    const names = db.tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'annotations',
        'backups',
        'citations',
        'connections',
        'docInspectorConfigs',
        'docUpdates',
        'docs',
        'meta',
        'noteAttachments',
        'notes',
        'palettes',
        'revisions',
        'sections',
        'settings',
        'spaces',
        'syncAttachmentChunks',
        'syncInbox',
        'syncOperations',
        'syncProviderBindings',
        'syncTombstones',
        'syncs',
        'syncConfigs',
        'trustedDevices',
        'writerNotebookAssets',
        'writerNotebookPages',
        'writerNotebooks',
      ].sort(),
    );
  });

  it('round-trips a docUpdates row with an auto-increment id and intact bytes', async () => {
    const payload = new Uint8Array([0, 1, 2, 253, 254, 255]);
    const row: DocUpdate = {
      docId: 'd1',
      engine: 'yjs',
      formatVersion: 1,
      payload,
      createdAt: 10,
    };
    const id = await db.docUpdates.add(row);
    expect(typeof id).toBe('number');

    const stored = await db.docUpdates.get(id);
    expect(stored?.id).toBe(id);
    expect(Array.from(stored?.payload ?? [])).toEqual(Array.from(payload));

    const second = await db.docUpdates.add({
      docId: 'd1',
      engine: 'yjs',
      formatVersion: 1,
      payload: new Uint8Array([9]),
      createdAt: 20,
    });
    expect(second).toBeGreaterThan(id as number);
  });

  it('queries docUpdates by the docId index', async () => {
    await db.docUpdates.bulkAdd([
      { docId: 'a', engine: 'yjs', formatVersion: 1, payload: new Uint8Array([1]), createdAt: 1 },
      { docId: 'a', engine: 'yjs', formatVersion: 1, payload: new Uint8Array([2]), createdAt: 2 },
      { docId: 'b', engine: 'yjs', formatVersion: 1, payload: new Uint8Array([3]), createdAt: 3 },
    ]);
    expect(await db.docUpdates.where('docId').equals('a').count()).toBe(2);
  });

  it('supports the compound indexes callers rely on', async () => {
    await db.docs.bulkPut([
      { ...sampleMetadata(), id: 'd1', spaceId: 's1', sectionId: 'sec1', name: 'A', body: EMPTY_LEXICAL_JSON, meta: { wordCount: 0 }, updatedAt: 1 },
      { ...sampleMetadata(), id: 'd2', spaceId: 's1', sectionId: 'sec2', name: 'B', body: EMPTY_LEXICAL_JSON, meta: { wordCount: 0 }, updatedAt: 2 },
    ]);
    expect(
      await db.docs.where('[spaceId+sectionId]').equals(['s1', 'sec1']).count(),
    ).toBe(1);

    await db.citations.bulkPut([
      { ...sampleMetadata(), id: 'c-old', spaceId: 's1', key: 'old', authors: 'B', title: 'U', year: 1995, type: 'misc', useCount: 0 },
      { ...sampleMetadata(), id: 'c-new', spaceId: 's1', key: 'new', authors: 'A', title: 'T', year: 2020, type: 'misc', useCount: 0 },
    ]);
    const ordered = await db.citations
      .where('[spaceId+year]')
      .between(['s1', Dexie.minKey], ['s1', Dexie.maxKey])
      .toArray();
    expect(ordered.map((c) => c.id)).toEqual(['c-old', 'c-new']);
  });
});
