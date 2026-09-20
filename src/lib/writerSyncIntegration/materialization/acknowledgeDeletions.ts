import type { LoremDB } from '@/db/LoremDB';
import type { DeviceId, TrustedDeviceRegistry } from 'writer-sync/core';
import { compareOperations, type OperationAcknowledgement } from 'writer-sync/operations';

/** What one peer has read, and which peer read it. */
export type PeerAcknowledgementIntent = OperationAcknowledgement & {
  /** The peer on the connection — never the origin whose work it read. */
  deviceId: DeviceId;
};

/**
 * What a peer's acknowledgement means for the deletions it covers.
 *
 * A peer reports how far it has read each originating device within a scope, and
 * that watermark is what lets the journal drop frames. A deletion is not
 * released the same way: its tombstone outlives the frames around it, so the
 * evidence has to be durable in its own right — the acknowledged frame may
 * itself be compacted later, and the comparison that justified the release
 * could no longer be made.
 *
 * So the watermark and the coverage it implies are recorded together, in one
 * transaction. Recorded separately, a device that stopped between them would
 * keep a deletion no peer was still waiting for, or — worse in the other
 * order — release one on evidence it had not yet stored.
 */

/** The deletions in `accessScopeId` this device made on behalf of `originDeviceId`. */
const tombstonesFrom = async (
  db: LoremDB,
  acknowledgement: PeerAcknowledgementIntent,
) => {
  const inScope = await db.syncTombstones
    .where('accessScopeId')
    .equals(acknowledgement.accessScopeId)
    .toArray();
  return inScope.filter(
    (tombstone) =>
      String(tombstone.deviceId) === String(acknowledgement.originDeviceId),
  );
};

/**
 * Record a peer's acknowledgement, and mark the deletions it covers.
 *
 * A deletion is covered when the peer has read at or past the delete frame from
 * the same origin: acknowledgement is per originating device precisely because
 * one device's position says nothing about another's.
 */
export const recordPeerAcknowledgement = async (options: {
  db: LoremDB;
  registry: TrustedDeviceRegistry;
  acknowledgement: PeerAcknowledgementIntent;
}): Promise<void> => {
  const { db, registry, acknowledgement } = options;
  const peer = String(acknowledgement.deviceId);

  await db.transaction(
    'rw',
    [db.trustedDevices, db.syncOperations, db.syncTombstones],
    async () => {
      await registry.acknowledge(acknowledgement);
      const acknowledged = await db.syncOperations.get(
        String(acknowledgement.operationId),
      );
      // An acknowledgement naming an operation this journal no longer holds
      // covers nothing that can be checked — the same rule compaction applies
      // to a watermark it cannot resolve.
      if (acknowledged === undefined) return;

      for (const tombstone of await tombstonesFrom(db, acknowledgement)) {
        if (tombstone.acknowledgedBy.includes(peer)) continue;
        const deletion = await db.syncOperations.get(String(tombstone.operationId));
        if (deletion === undefined) continue;
        if (compareOperations(deletion, acknowledged) > 0) continue;
        await db.syncTombstones.put({
          ...tombstone,
          acknowledgedBy: [...tombstone.acknowledgedBy, peer],
        });
      }
    },
  );
};
