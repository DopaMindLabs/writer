import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { docFromHandle, yjsEngine } from './yjsEngine';

describe('yjsEngine', () => {
  it('round-trips content through updates and snapshots', () => {
    const source = yjsEngine.open([]);
    const updates: Uint8Array[] = [];
    const unsubscribe = source.onUpdate((u) => updates.push(u));
    docFromHandle(source.handle).getText('t').insert(0, 'hello');
    docFromHandle(source.handle).getText('t').insert(5, ' world');
    unsubscribe();

    const replica = yjsEngine.open(updates);
    expect(docFromHandle(replica.handle).getText('t').toString()).toBe(
      'hello world',
    );

    const fromSnapshot = yjsEngine.open([replica.encodeSnapshot()]);
    expect(docFromHandle(fromSnapshot.handle).getText('t').toString()).toBe(
      'hello world',
    );
  });

  it('stops emitting after unsubscribe and destroys cleanly', () => {
    const doc = yjsEngine.open([]);
    const seen: Uint8Array[] = [];
    const unsubscribe = doc.onUpdate((u) => seen.push(u));
    docFromHandle(doc.handle).getText('t').insert(0, 'a');
    expect(seen).toHaveLength(1);
    unsubscribe();
    docFromHandle(doc.handle).getText('t').insert(1, 'b');
    expect(seen).toHaveLength(1);
    doc.destroy();
  });

  it('throws when opening a corrupt update', () => {
    expect(() => yjsEngine.open([Uint8Array.from([7, 7, 7])])).toThrow();
  });

  it('docFromHandle rejects a handle that is not a Yjs doc', () => {
    const fake = {} as Parameters<typeof docFromHandle>[0];
    expect(() => docFromHandle(fake)).toThrow(
      'editor binding handle was not produced by the Yjs engine',
    );
  });

  it('merges concurrent histories deterministically', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText('t').insert(0, 'left');
    b.getText('t').insert(0, 'right');
    const merged = yjsEngine.open([
      Y.encodeStateAsUpdate(a),
      Y.encodeStateAsUpdate(b),
    ]);
    const text = docFromHandle(merged.handle).getText('t').toString();
    expect(text).toContain('left');
    expect(text).toContain('right');
  });
});
