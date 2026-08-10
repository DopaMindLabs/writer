import { describe, it, expect } from 'vitest';
import { STORES } from './stores';
import { LoremDB } from './LoremDB';

describe('STORES', () => {
  it('is applied as a table on LoremDB for every entry', async () => {
    const db = new LoremDB('stores-spec-test');
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      Object.keys(STORES).sort(),
    );
    await db.delete();
  });

  it('keeps docUpdates as the only auto-increment table', () => {
    const autoIncrement = Object.entries(STORES)
      .filter(([, spec]) => spec.trimStart().startsWith('++'))
      .map(([name]) => name);
    expect(autoIncrement).toEqual(['docUpdates']);
  });

  it('keeps notebook indexes limited to ownership and lookup keys', () => {
    expect(STORES.writerNotebooks).toBe('id, spaceId');
    expect(STORES.writerNotebookPages).toBe('id, notebookId, spaceId');
    expect(STORES.writerNotebookAssets).toBe('id, notebookId, spaceId');
  });
});
