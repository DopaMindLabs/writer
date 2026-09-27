import type { AccessScopeId } from '../core/providers.types';
import type { DeviceId, OperationId } from '../core/ids';
import type { ScopeAcknowledgements } from '../core/trustedDevice.types';
import type { EncryptedSyncFrame, SyncTombstone } from './operation.types';
import { compareOperations } from './convergence';
import { retentionCutoff, type RetentionOptions } from './journalRetention';

/**
 * Selects compactable journal frames. A frame expires after every trusted peer
 * acknowledges it or its retention window closes. Acknowledgements are tracked
 * per origin device. Delete frames remain coupled to their tombstones and leave
 * only when the tombstone is releasable; frames kept until held ignore the window.
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
  /**
   * Frames the retention window may not take: only once every trusted peer holds
   * one does it leave, and the frame each peer's acknowledgement names stays
   * with it as that peer's evidence. A deletion a scope still owes its peers
   * that no tombstone records is one — dropped by age, it would never reach a
   * peer returning after the window.
   */
  keptUntilHeld?: readonly OperationId[];
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
  const untilHeld = new Set((options.keptUntilHeld ?? []).map(String));
  const aged = (frame: EncryptedSyncFrame): boolean =>
    frame.logicalAt.millis <= cutoff && !untilHeld.has(String(frame.operationId));

  const heldByEveryPeer = (frame: EncryptedSyncFrame): boolean =>
    peers.length > 0 &&
    peers.every((peer) => isHeldByPeer({ peer, frame, frames: index }));

  // A peer is seen to hold a kept frame through the frame its acknowledgement
  // names, which must outlast the kept one: dropped first, the mark would name
  // nothing, and the kept frame could never be shown held by every peer.
  const evidence = new Set<string>();
  for (const frame of frames) {
    if (!untilHeld.has(String(frame.operationId)) || heldByEveryPeer(frame)) continue;
    for (const peer of peers) {
      const mark = highWaterMark(peer, frame);
      if (mark !== undefined && isHeldByPeer({ peer, frame, frames: index })) {
        evidence.add(String(mark));
      }
    }
  }

  return frames
    .filter((frame) => !retained.has(String(frame.operationId)))
    .filter((frame) => !evidence.has(String(frame.operationId)))
    .filter((frame) => aged(frame) || heldByEveryPeer(frame))
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
  options: { withoutPeersIsUnanimous?: boolean } = {},
): SyncTombstone[] => {
  // With nobody to wait for, unanimity is vacuous. A routine pass therefore
  // holds: a device between pairings is not a device that has finished with
  // them, and a peer paired tomorrow could still be holding what was deleted
  // today. Removal is the exception, because there the user has said the
  // relationship is over — see `withoutPeersIsUnanimous`.
  if (peers.length === 0) return options.withoutPeersIsUnanimous ? [...tombstones] : [];
  return tombstones.filter((tombstone) => {
    const acknowledged = new Set(tombstone.acknowledgedBy);
    return peers.every((peer) => acknowledged.has(String(peer.deviceId)));
  });
};
