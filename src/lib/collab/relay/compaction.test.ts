import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { generateMemberKeys, memberPublicOf, type MemberKeys } from '@/lib/collab/crypto/memberKeys';
import { generateContentKey } from '@/lib/collab/crypto/contentKey';
import { openFrame, type AuthorResolver } from '@/lib/collab/crypto/envelope';
import { maybeCompact, COMPACTION_THRESHOLD, type RoomContext } from './compaction';
import { decodeEnvelope } from './frameCodec';
import type { RelayBlob } from './relayClient';

let writer: MemberKeys;
let contentKey: CryptoKey;
let resolver: AuthorResolver;

beforeEach(async () => {
  writer = await generateMemberKeys('W');
  contentKey = await generateContentKey();
  const pub = await memberPublicOf(writer, 'Writer');
  resolver = (id) => (id === 'W' ? { pub, role: 'writer' } : null);
});

const makeCtx = (over: Partial<RoomContext> = {}) => {
  const posted: RelayBlob[] = [];
  const supersedes: number[] = [];
  const ctx: RoomContext = {
    roomId: 'room',
    isWriter: () => true,
    keys: () => writer,
    contentKey: () => contentKey,
    epoch: () => 1,
    encodeState: () => Y.encodeStateAsUpdate(new Y.Doc()),
    currentSeq: () => 0,
    post: (blob) => posted.push(blob),
    supersede: (upto) => supersedes.push(upto),
    ...over,
  };
  return { ctx, posted, supersedes };
};

const openSnapshot = async (blob: RelayBlob): Promise<Uint8Array> =>
  openFrame(contentKey, resolver, decodeEnvelope(blob.payload));

describe('maybeCompact', () => {
  it('posts a snapshot + supersede once the tail exceeds the threshold', async () => {
    const { ctx, posted, supersedes } = makeCtx({ currentSeq: () => 42 });
    const compacted = await maybeCompact(ctx, COMPACTION_THRESHOLD + 1);
    expect(compacted).toBe(true);
    expect(posted).toHaveLength(1);
    expect(posted[0].type).toBe('snapshot');
    expect(supersedes).toEqual([42]);
  });

  it('does nothing at or below the threshold', async () => {
    const { ctx, posted, supersedes } = makeCtx();
    expect(await maybeCompact(ctx, COMPACTION_THRESHOLD)).toBe(false);
    expect(posted).toHaveLength(0);
    expect(supersedes).toHaveLength(0);
  });

  it('never compacts for a reader', async () => {
    const { ctx, posted } = makeCtx({ isWriter: () => false });
    expect(await maybeCompact(ctx, COMPACTION_THRESHOLD + 1000)).toBe(false);
    expect(posted).toHaveLength(0);
  });

  it('lets an offline peer converge from snapshot + tail', async () => {
    const docA = new Y.Doc();
    docA.getText('t').insert(0, 'hello world');
    const { ctx, posted } = makeCtx({ encodeState: () => Y.encodeStateAsUpdate(docA) });
    await maybeCompact(ctx, COMPACTION_THRESHOLD + 1);

    // A peer that missed the truncated blobs rebuilds from the snapshot alone.
    const lagging = new Y.Doc();
    Y.applyUpdate(lagging, await openSnapshot(posted[0]));
    expect(lagging.getText('t').toString()).toBe('hello world');
  });

  it('merges unsent local edits on top of a pulled snapshot', async () => {
    const docA = new Y.Doc();
    docA.getText('t').insert(0, 'shared');
    const { ctx, posted } = makeCtx({ encodeState: () => Y.encodeStateAsUpdate(docA) });
    await maybeCompact(ctx, COMPACTION_THRESHOLD + 1);

    const docB = new Y.Doc();
    docB.getText('t').insert(0, 'local '); // an unsent local edit
    Y.applyUpdate(docB, await openSnapshot(posted[0]));
    const merged = docB.getText('t').toString();
    expect(merged).toContain('shared');
    expect(merged).toContain('local');
  });

  it('leaves the room convergent under two concurrent compactions', async () => {
    const docA = new Y.Doc();
    docA.getText('t').insert(0, 'AAA');
    const docB = new Y.Doc();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    docB.getText('t').insert(0, 'BBB');
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB)); // both writers now converged

    const { ctx: ctxA, posted: postedA } = makeCtx({ encodeState: () => Y.encodeStateAsUpdate(docA) });
    const { ctx: ctxB, posted: postedB } = makeCtx({ encodeState: () => Y.encodeStateAsUpdate(docB) });
    await maybeCompact(ctxA, COMPACTION_THRESHOLD + 1);
    await maybeCompact(ctxB, COMPACTION_THRESHOLD + 1);
    const snapA = await openSnapshot(postedA[0]);
    const snapB = await openSnapshot(postedB[0]);

    // Applying either snapshot in either order reaches the same, complete state.
    const d1 = new Y.Doc();
    Y.applyUpdate(d1, snapA);
    Y.applyUpdate(d1, snapB);
    const d2 = new Y.Doc();
    Y.applyUpdate(d2, snapB);
    Y.applyUpdate(d2, snapA);
    expect(d1.getText('t').toString()).toBe(d2.getText('t').toString());
    expect(d1.getText('t').toString()).toBe(docA.getText('t').toString());
  });
});
