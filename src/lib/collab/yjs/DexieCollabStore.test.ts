import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { db } from '@/db/db';
import { createDexieCollabStore } from './DexieCollabStore';

const seedKey = (docId: string): string => `collab-seed:${docId}`;

/** A live Yjs source whose incremental updates are captured as they happen. */
const newSource = () => {
  const doc = new Y.Doc();
  const updates: Uint8Array[] = [];
  doc.on('update', (update: Uint8Array) => updates.push(update));
  const text = doc.getText('t');
  const edit = (chunk: string) => {
    doc.transact(() => text.insert(text.length, chunk));
  };
  return { updates, text, edit };
};

/** Reconstruct the Y.Text 't' content from a set of update payloads. */
const textFrom = (payloads: readonly Uint8Array[]): string => {
  const doc = new Y.Doc();
  for (const payload of payloads) Y.applyUpdate(doc, payload, 'test');
  const value = doc.getText('t').toString();
  doc.destroy();
  return value;
};

describe('DexieCollabStore', () => {
  const store = createDexieCollabStore();

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('round-trips appended updates intact and in order', async () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6, 7]);
    await store.append('d1', a);
    await store.append('d1', b);

    const loaded = await store.loadAll('d1');
    expect(loaded).toHaveLength(2);
    expect(Array.from(loaded[0])).toEqual([1, 2, 3]);
    expect(Array.from(loaded[1])).toEqual([4, 5, 6, 7]);
  });

  it('scopes loadAll to the requested doc', async () => {
    await store.append('d1', new Uint8Array([1]));
    await store.append('d2', new Uint8Array([2]));
    expect(await store.loadAll('d1')).toHaveLength(1);
    expect(await store.loadAll('d2')).toHaveLength(1);
  });

  it('seeds exactly once and reports already-seeded thereafter', async () => {
    expect(await store.trySeed('d1', new Uint8Array([9]))).toBe('seeded');
    expect(await store.trySeed('d1', new Uint8Array([8]))).toBe('already-seeded');

    expect(await store.loadAll('d1')).toHaveLength(1);
    expect(Array.from((await store.loadAll('d1'))[0])).toEqual([9]);
    expect(await db.meta.get(seedKey('d1'))).toBeDefined();
  });

  it('lets exactly one caller win a concurrent seed race', async () => {
    const results = await Promise.all([
      store.trySeed('d1', new Uint8Array([1])),
      store.trySeed('d1', new Uint8Array([2])),
    ]);
    expect(results.filter((r) => r === 'seeded')).toHaveLength(1);
    expect(results.filter((r) => r === 'already-seeded')).toHaveLength(1);
    expect(await store.loadAll('d1')).toHaveLength(1);
  });

  it('is a no-op when the log is at or below the threshold', async () => {
    for (let i = 0; i < 5; i += 1) await store.append('d1', new Uint8Array([i]));
    await store.compact('d1');
    expect(await store.loadAll('d1')).toHaveLength(5);
  });

  it('compacts a long log to a single update that preserves state', async () => {
    const src = newSource();
    for (let i = 0; i < 201; i += 1) src.edit('x');
    for (const update of src.updates) await store.append('d1', update);

    await store.compact('d1');

    const loaded = await store.loadAll('d1');
    expect(loaded).toHaveLength(1);
    expect(textFrom(loaded)).toBe(src.text.toString());
  });

  it('preserves an update appended after compaction', async () => {
    const src = newSource();
    for (let i = 0; i < 201; i += 1) src.edit('x');
    for (const update of src.updates) await store.append('d1', update);
    await store.compact('d1');

    // A new edit after the compaction read must not be lost.
    src.edit('y');
    await store.append('d1', src.updates[src.updates.length - 1]);

    const loaded = await store.loadAll('d1');
    expect(loaded).toHaveLength(2);
    expect(textFrom(loaded)).toBe(src.text.toString());
  });

  it('deleteDoc clears the log and seed key without touching other docs', async () => {
    await store.trySeed('d1', new Uint8Array([1]));
    await store.append('d1', new Uint8Array([2]));
    await store.trySeed('d2', new Uint8Array([3]));

    await store.deleteDoc('d1');

    expect(await store.loadAll('d1')).toHaveLength(0);
    expect(await db.meta.get(seedKey('d1'))).toBeUndefined();
    expect(await store.loadAll('d2')).toHaveLength(1);
    expect(await db.meta.get(seedKey('d2'))).toBeDefined();
  });
});
