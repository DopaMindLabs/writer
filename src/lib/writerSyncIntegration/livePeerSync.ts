import type { AccessScopeId, SyncCoordinator } from 'writer-sync/core';
import Dexie from 'dexie';
import {
  CATCH_UP_PROTOCOL_VERSION,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  fitsMessageBudget,
  type AttachmentTransfer,
  type CatchUpMessage,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import type { SyncTransport } from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';
import { createAttachmentChunkStore } from './attachmentChunkStore';

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

const afterCurrentTransaction = (): Promise<void> => {
  const transaction = Dexie.currentTransaction;
  if (!transaction.active) return Promise.resolve();
  return new Promise((resolve, reject) => {
    transaction.on('complete', resolve);
    transaction.on('abort', () => {
      reject(transaction.idbtrans.error ?? new Error('live frame transaction aborted'));
    });
  });
};

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
interface LiveLink {
  transport: SyncTransport;
  attachments: AttachmentTransfer;
  offerAttachment: (attachmentId: string) => Promise<void>;
  close: () => void;
}

const linkCache = (
  create: (accessScopeId: AccessScopeId) => Promise<LiveLink>,
) => {
  const open = new Map<string, Promise<LiveLink>>();

  /**
   * Stop serving this link, if it is still the one being served.
   *
   * The guard matters because a bearer reports itself gone whenever it likes,
   * including after the scope has already moved on to a fresh link — which must
   * survive its predecessor's news.
   */
  const forget = (accessScopeId: string, entry: Promise<LiveLink>): void => {
    if (open.get(accessScopeId) === entry) open.delete(accessScopeId);
  };

  return {
    for: (accessScopeId: AccessScopeId): Promise<LiveLink> => {
      const existing = open.get(accessScopeId);
      if (existing !== undefined) return existing;
      const created = create(accessScopeId);
      open.set(accessScopeId, created);
      // A bearer that goes away, and a link that never opened at all, must not be
      // handed out again: the next frame opens a fresh one instead of writing
      // into a channel that is gone, or being answered with an old refusal.
      void created.then(
        (link) => {
          link.transport.onClosed?.(() => {
            forget(accessScopeId, created);
            link.close();
          });
        },
        () => {
          forget(accessScopeId, created);
        },
      );
      return created;
    },
    closeAll: () => {
      for (const pending of open.values()) {
        void pending.then((link) => {
          link.close();
        }).catch(() => undefined);
      }
      open.clear();
    },
  };
};

const openLiveLink = async (options: {
  db: LoremDB;
  accessScopeId: AccessScopeId;
  createTransport: () => Promise<SyncTransport>;
}): Promise<LiveLink> => {
  const { db, accessScopeId } = options;
  const transport = await options.createTransport();
  const store = createAttachmentChunkStore(db);
  const send = (message: CatchUpMessage): void => {
    transport.send(encodeCatchUpMessage(message));
  };
  const attachments = store.create(send);
  const off = transport.onMessage((bytes) => {
    void attachments
      .receive(decodeCatchUpMessage(bytes))
      .catch((error: unknown) => {
        appLogger.warn('receiving a live attachment message failed', error);
      });
  });
  return {
    transport,
    attachments,
    offerAttachment: async (attachmentId) => {
      const manifests = await store.manifestsForScopes([accessScopeId]);
      const selected = manifests.filter(
        (manifest) => manifest.attachmentId === attachmentId,
      );
      if (selected.length > 0) attachments.offer(selected);
    },
    close: () => {
      off();
      transport.close();
    },
  };
};

export const startLivePeerSync = (options: LivePeerSyncOptions): (() => void) => {
  const { db, coordinator, providerId } = options;
  const realtime = coordinator.provider(providerId)?.realtime;
  if (realtime === undefined) return () => undefined;

  const links = linkCache((accessScopeId) =>
    openLiveLink({
      db,
      accessScopeId,
      createTransport: () =>
        realtime.createTransport({
          accessScopeId,
          channelId: OPERATIONS_CHANNEL,
        }),
    }),
  );

  const send = async (frame: EncryptedSyncFrame): Promise<void> => {
    const link = await links.for(frame.accessScopeId);
    const bytes = encodeCatchUpMessage({
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames: [frame],
      final: true,
    });
    // A frame the bearer cannot carry is skipped with its name in the log, not
    // thrown at the transport: catch-up meets the same ceiling, so this frame
    // does not cross the peer link at all until it is thinned.
    if (!fitsMessageBudget(bytes.byteLength, link.transport.maxMessageBytes)) {
      appLogger.warn('live frame exceeds the transport ceiling, not sent', {
        operationId: String(frame.operationId),
        byteLength: bytes.byteLength,
      });
      return;
    }
    link.transport.send(bytes);
    if (frame.entityTable === 'noteAttachments') {
      await Dexie.ignoreTransaction(() => link.offerAttachment(frame.entityId));
    }
  };

  const onCreated = (_key: unknown, frame: EncryptedSyncFrame): void => {
    // Captured synchronously — the transaction has to be read while it is still
    // the current one — but waited on before anything crosses the link. The hook
    // runs mid-transaction, so a frame sent from here would reach the peer even
    // when the write that produced it never commits, and the peer would hold an
    // operation this device does not.
    const committed = afterCurrentTransaction();
    void committed
      .then(
        async () => {
          const here = await options.deviceId();
          // Only this device's own work: a frame that arrived from a peer is
          // already held by the peer it came from.
          if (String(frame.deviceId) !== here) return;
          await send(frame);
        },
        // Rolled back: there is no operation, so there is nothing to carry and
        // nothing has gone wrong. Said quietly, because a discarded write is not
        // a failure to sync.
        () => undefined,
      )
      .catch((error: unknown) => {
        // A peer that cannot be reached is not a failed write either: the frame
        // is in the journal, and catch-up carries it the next time one connects.
        appLogger.warn('sending a frame to a peer failed', error);
      });
  };

  db.syncOperations.hook('creating', onCreated);

  return () => {
    db.syncOperations.hook('creating').unsubscribe(onCreated);
    links.closeAll();
  };
};
