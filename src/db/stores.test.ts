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

  it('declares shares keyed by docId and indexed by roomId', async () => {
    const db = new LoremDB('stores-shares-test');
    await db.open();
    const shares = db.table('shares');
    expect(shares.schema.primKey.keyPath).toBe('docId');
    expect(shares.schema.indexes.map((index) => index.keyPath)).toContain('roomId');
    await db.delete();
  });
});
