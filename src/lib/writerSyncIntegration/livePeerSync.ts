import type { AccessScopeId, SyncCoordinator } from 'writer-sync/core';
import {
  CATCH_UP_PROTOCOL_VERSION,
  encodeCatchUpMessage,
  fitsMessageBudget,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import type { SyncTransport } from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';

/**
 * Sending this device's new work to the devices it is paired with, as it is
 * written.
 *
 * Catch-up answers "what did I miss?" once, when a connection opens. This is the
 * other half: a frame journalled while a peer is connected reaches it now,
 * rather than waiting for the next time someone opens the pairing screen.
 *
 * It sends the same `frames` message catch-up already speaks, so the receiving
 * device verifies, journals and materialises it by exactly the path it uses for
 * everything else — no second way for an operation to arrive, and so no second
 * place for the decision to apply it to go wrong.
 *
 * **Only what this device wrote.** A frame that arrived from a peer is not
 * re-sent: the peer it came from has it, and echoing it back would spend the
 * connection restating what both ends already hold.
 */

/** One channel per scope, named for what it carries. */
const OPERATIONS_CHANNEL = 'operations';

export interface LivePeerSyncOptions {
  db: LoremDB;
  coordinator: SyncCoordinator;
  /** Which provider carries live peer transport. */
  providerId: string;
  /** This device's id, so its own work can be told from a peer's. */
  deviceId: () => Promise<string>;
}

/**
 * Transports are made once per scope and kept: creating one asks the peer
 * session for a channel, and a channel per frame would open one per keystroke.
 */
const transportCache = (
  create: (accessScopeId: AccessScopeId) => Promise<SyncTransport>,
) => {
  const open = new Map<string, Promise<SyncTransport>>();
  return {
    for: (accessScopeId: AccessScopeId): Promise<SyncTransport> => {
      const existing = open.get(accessScopeId);
      if (existing !== undefined) return existing;
      const created = create(accessScopeId);
      open.set(accessScopeId, created);
      return created;
    },
    closeAll: () => {
      for (const pending of open.values()) {
        void pending.then((transport) => {
          transport.close();
        }).catch(() => undefined);
      }
      open.clear();
    },
  };
};

export const startLivePeerSync = (options: LivePeerSyncOptions): (() => void) => {
  const { db, coordinator, providerId } = options;
  const realtime = coordinator.provider(providerId)?.realtime;
  if (realtime === undefined) return () => undefined;

  const transports = transportCache((accessScopeId) =>
    realtime.createTransport({ accessScopeId, channelId: OPERATIONS_CHANNEL }),
  );

  const send = async (frame: EncryptedSyncFrame): Promise<void> => {
    const transport = await transports.for(frame.accessScopeId);
    const bytes = encodeCatchUpMessage({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames: [frame],
      final: true,
    });
    // A frame the bearer cannot carry is skipped with its name in the log, not
    // thrown at the transport: catch-up meets the same ceiling, so this frame
    // does not cross the peer link at all until it is thinned.
    if (!fitsMessageBudget(bytes.byteLength, transport.maxMessageBytes)) {
      appLogger.warn('live frame exceeds the transport ceiling, not sent', {
        operationId: String(frame.operationId),
        byteLength: bytes.byteLength,
      });
      return;
    }
    transport.send(bytes);
  };

  const onCreated = (_key: unknown, frame: EncryptedSyncFrame): void => {
    void options
      .deviceId()
      .then(async (here) => {
        // Only this device's own work: a frame that arrived from a peer is
        // already held by the peer it came from.
        if (String(frame.deviceId) !== here) return;
        await send(frame);
      })
      .catch((error: unknown) => {
        // A peer that cannot be reached is not a failed write. The frame is in
        // the journal, and catch-up carries it the next time one connects.
        appLogger.warn('sending a frame to a peer failed', error);
      });
  };

  db.syncOperations.hook('creating', onCreated);

  return () => {
    db.syncOperations.hook('creating').unsubscribe(onCreated);
    transports.closeAll();
  };
};
