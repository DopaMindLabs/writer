import { describe, it, expect } from 'vitest';
import { buildDb } from './buildDb';
import { STORES } from './stores';

/** Primary-key path a STORES spec declares, stripped of Dexie modifiers. */
const primKeyPath = (spec: string): string =>
  spec.split(',')[0].trim().replace(/^\+\+/, '').replace(/^&/, '');

describe('buildDb', () => {
  it('constructs a database named lipsum by default', () => {
    const db = buildDb();
    expect(db.name).toBe('lipsum');
    db.close();
  });

  it('accepts a custom name', () => {
    const db = buildDb('custom-name');
    expect(db.name).toBe('custom-name');
    db.close();
  });

  it('applies the STORES schema table-for-table at version 1', async () => {
    const db = buildDb('build-db-schema-test');
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      Object.keys(STORES).sort(),
    );
    for (const table of db.tables) {
      expect(table.schema.primKey.keyPath).toBe(primKeyPath(STORES[table.name]));
    }

    await db.delete();
  });
});
