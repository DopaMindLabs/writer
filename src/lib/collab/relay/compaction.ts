/**
 * Client-driven compaction of the relay's append log. A blind relay can never
 * merge ciphertext, so writers keep the log bounded themselves: once the room
 * tail exceeds the threshold, a writer posts an encrypted, signed **full-state
 * snapshot** and an authenticated **`supersede ≤ seq N`** instruction telling the
 * relay to drop the blobs the snapshot subsumes.
 *
 * Full-state snapshots make truncation safe for lagging or offline peers: Yjs
 * converges from snapshot + surviving tail, and any unsent local edits still
 * merge on top. It is idempotent under races — two writers compacting at once
 * both post valid snapshots; the relay keeps the higher supersede and peers
 * converge from whichever snapshot they receive.
 */
import { sealFrame } from '@/lib/collab/crypto/envelope';
import type { MemberKeys } from '@/lib/collab/crypto/memberKeys';
import { encodeEnvelope } from './frameCodec';
import type { RelayBlob } from './relayClient';

/** The tail length beyond which a writer compacts (mirrors the store threshold). */
export const COMPACTION_THRESHOLD = Number(import.meta.env.VITE_COMPACT_THRESHOLD) || 200;

/** What compaction needs from the room — engine- and transport-agnostic. */
export interface RoomContext {
  readonly roomId: string;
  readonly isWriter: () => boolean;
  readonly keys: () => MemberKeys;
  readonly contentKey: () => CryptoKey;
  readonly epoch: () => number;
  /** The current full document state (`Y.encodeStateAsUpdate`), engine-side. */
  readonly encodeState: () => Uint8Array;
  /** The highest relay seq the snapshot subsumes. */
  readonly currentSeq: () => number;
  readonly post: (blob: RelayBlob) => void;
  readonly supersede: (upto: number) => void;
}

/**
 * Post a snapshot + supersede if the tail is over the threshold and this member
 * may write. Returns whether a compaction was performed.
 */
export const maybeCompact = async (ctx: RoomContext, tailLength: number): Promise<boolean> => {
  if (tailLength <= COMPACTION_THRESHOLD || !ctx.isWriter()) return false;
  const upto = ctx.currentSeq();
  const env = await sealFrame(
    ctx.contentKey(),
    ctx.keys(),
    { roomId: ctx.roomId, type: 'snapshot', epoch: ctx.epoch() },
    ctx.encodeState(),
  );
  ctx.post({ type: 'snapshot', payload: encodeEnvelope(env) });
  ctx.supersede(upto);
  return true;
};
