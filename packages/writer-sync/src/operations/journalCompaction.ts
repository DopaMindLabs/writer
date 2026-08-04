import type { AccessScopeId } from '../core/providers.types';
import type { DeviceId, OperationId } from '../core/ids';
import type { ScopeAcknowledgements } from '../core/trustedDevice.types';
import type { EncryptedSyncFrame, SyncTombstone } from './operation.types';
import { compareOperations } from './convergence';
import { retentionCutoff, type RetentionOptions } from './journalRetention';

/**
 * When a journalled frame may be dropped.
 *
 * A frame is compactable once **every currently-trusted peer already holds it**,
 * or once the retention window has elapsed — whichever comes first. The
 * acknowledgement half lets a small, well-connected set of devices reclaim space
 * long before the window; the window is the backstop that stops one device that
 * never returns from pinning the journal open forever. Removing a device from the
 * trust registry releases its hold immediately, because it is no longer a peer
 * whose acknowledgement is awaited.
 *
 * **Unanimity over an empty set is not evidence.** With no trusted peer, the
 * acknowledgement clause would be vacuously true and would erase the journal
 * wholesale; it is deliberately disabled there, leaving the window in sole
 * charge.
 *
 * **Acknowledgements are per origin device, not one mark per scope.** A single
 * high-water mark per scope is unsound across three or more devices: an
 * operation from device C, logically older than one from device A that the peer
 * has acknowledged, would be judged covered even though the peer never saw it,
 * and compaction would lose it. Each peer therefore records how far it has read
 * *each* originating device, and coverage is only ever decided between
 * operations from the same origin — where that device's own clock gives a total
 * order that cannot disagree with delivery.
 *
 * **A deletion is state, not history.** A delete frame named by a surviving
 * tombstone is exempt from the window entirely: it leaves when the tombstone
 * does, on unanimous acknowledgement or the removal of the peer that never
 * acknowledged it. Ageing it out separately would leave the deletion with
 * nothing to serve it from, and a device returning after the window would keep
 * a row every other device had deleted.
 */

/** How far one still-trusted peer has read each originating device, per scope. */
export interface PeerAcknowledgement {
  deviceId: DeviceId;
  acknowledgedOperations: Readonly<Partial<Record<AccessScopeId, ScopeAcknowledgements>>>;
}

export interface CompactionOptions {
  retention: RetentionOptions;
  /** Only currently-trusted peers hold the journal open. */
  peers: readonly PeerAcknowledgement[];
  /**
   * The deletion state that survives this pass. A tombstone and the signed
   * delete frame it names are one retention unit: the tombstone is what a
   * returning peer is served the deletion from, and the frame is the only
   * evidence of it anyone else will accept, so the window must not take one
   * while the other stands. Required rather than optional — a caller that
   * omitted it would compact away deletions it still owes its peers.
   */
  tombstones: readonly SyncTombstone[];
}

const byOperationId = (
  frames: readonly EncryptedSyncFrame[],
): ReadonlyMap<string, EncryptedSyncFrame> =>
  new Map(frames.map((frame) => [String(frame.operationId), frame]));

const highWaterMark = (
  peer: PeerAcknowledgement,
  frame: EncryptedSyncFrame,
): OperationId | undefined =>
  peer.acknowledgedOperations[frame.accessScopeId]?.[String(frame.deviceId)];

/**
 * Whether `peer` demonstrably holds `frame`. An acknowledgement naming an
 * operation this journal no longer has is treated as covering nothing: it is
 * either already compacted — in which case everything left is newer — or unknown,
 * and neither justifies dropping data.
 */
const isHeldByPeer = (options: {
  peer: PeerAcknowledgement;
  frame: EncryptedSyncFrame;
  frames: ReadonlyMap<string, EncryptedSyncFrame>;
}): boolean => {
  const { peer, frame, frames } = options;
  const mark = highWaterMark(peer, frame);
  if (mark === undefined) return false;
  const acknowledged = frames.get(String(mark));
  return acknowledged !== undefined && compareOperations(frame, acknowledged) <= 0;
};

/** The frames that may be dropped from the journal. */
export const compactableOperationIds = (
  frames: readonly EncryptedSyncFrame[],
  options: CompactionOptions,
): OperationId[] => {
  const cutoff = retentionCutoff(options.retention);
  const index = byOperationId(frames);
  const { peers } = options;
  const retained = new Set(
    options.tombstones.map((tombstone) => String(tombstone.operationId)),
  );

  const heldByEveryPeer = (frame: EncryptedSyncFrame): boolean =>
    peers.length > 0 &&
    peers.every((peer) => isHeldByPeer({ peer, frame, frames: index }));

  return frames
    .filter((frame) => !retained.has(String(frame.operationId)))
    .filter((frame) => frame.logicalAt.millis <= cutoff || heldByEveryPeer(frame))
    .map((frame) => frame.operationId);
};

/**
 * The tombstones that may be dropped.
 *
 * Deliberately **no time backstop**: a tombstone is the only thing standing
 * between a returning device's stale `put` and a resurrected entity, so it is
 * released solely on unanimous acknowledgement by the devices still trusted.
 * Removing a device is therefore what releases a tombstone it never acknowledged
 * — the same release valve compaction uses, and the honest one, since a removed
 * device is no longer synchronised with at all.
 */
export const releasableTombstones = (
  tombstones: readonly SyncTombstone[],
  peers: readonly PeerAcknowledgement[],
): SyncTombstone[] => {
  if (peers.length === 0) return [];
  return tombstones.filter((tombstone) => {
    const acknowledged = new Set(tombstone.acknowledgedBy);
    return peers.every((peer) => acknowledged.has(String(peer.deviceId)));
  });
};
