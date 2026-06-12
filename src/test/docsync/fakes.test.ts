import { describe, expect, it } from 'vitest';
import { describeUpdateLogContract } from '@/test/docsync/updateLogContract';
import {
  FAKE_CORRUPT_BYTE,
  createFakeEngine,
  createFakeUpdateLog,
  type FakeEngineDoc,
} from '@/test/docsync/fakes';

// The fake must honour the same contract as the real Dexie adapter, so tests
// built on it (docBodyStore.test.ts) exercise true port semantics.
describeUpdateLogContract(() => createFakeUpdateLog());

describe('createFakeEngine', () => {
  it('applies updates, emits to listeners, and snapshots the lot', () => {
    const engine = createFakeEngine();
    const doc = engine.open([Uint8Array.from([1])]) as FakeEngineDoc;
    const seen: Uint8Array[] = [];
    const unsubscribe = doc.onUpdate((u) => seen.push(u));
    doc.emit(Uint8Array.from([2]));
    unsubscribe();
    doc.emit(Uint8Array.from([3]));
    expect(seen).toEqual([Uint8Array.from([2])]);
    expect(doc.encodeSnapshot()).toEqual(Uint8Array.from([1, 2, 3]));
  });

  it('throws on a corrupt update', () => {
    const engine = createFakeEngine();
    expect(() => engine.open([Uint8Array.from([FAKE_CORRUPT_BYTE])])).toThrow(
      'corrupt update',
    );
  });
});
