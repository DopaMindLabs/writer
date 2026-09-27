import type { LoremDB } from '@/db/LoremDB';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { acceptedEarlier, admittedFrame, requireJournalledTable } from './frameAdmission';
import { hasAccessScope } from './journalledRow';
import { createWriterFrameVerifier } from './writerFrameVerifier';

type EntityRef = Pick<SyncTombstone, 'entityTable' | 'entityId'>;

const entityKey = ({ entityTable, entityId }: EntityRef): string =>
  JSON.stringify([entityTable, entityId]);

/**
 * The scope an entity lives in now: its saved row's, else its standing
 * deletion's. A row's scope is routing metadata kept in the clear, and a cursor
 * read passes the encryption middleware by, so no content is decrypted for it.
 */
const currentScope = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  deletedIn: ReadonlyMap<string, string>;
}): Promise<string | undefined> => {
  const { db, frame, deletedIn } = options;
  const saved = await requireJournalledTable(db, frame.entityTable)
    .where(':id')
    .equals(frame.entityId)
    .filter(hasAccessScope)
    .first();
  return saved?.accessScopeId ?? deletedIn.get(entityKey(frame));
};

/**
 * The deletions a scope still owes its peers that no tombstone records. A scope
 * move withdraws an entity from its source with a delete while the entity lives
 * on in the destination, so no tombstone holds that delete. A device that reads
 * only the source learns of the move from the withdrawal alone, so it stays until
 * every peer holds it, and a rebuild of the source scope serves it. Only a delete
 * materialisation would admit counts, or one it accepted while its author was
 * trusted: one a provider merely wrote must neither pin itself in the journal
 * nor be served onward.
 */
export const owedWithdrawals = async (options: {
  db: LoremDB;
  frames: readonly EncryptedSyncFrame[];
  tombstones: readonly SyncTombstone[];
}): Promise<EncryptedSyncFrame[]> => {
  const { db, frames, tombstones } = options;
  const recorded = new Set(tombstones.map(({ operationId }) => String(operationId)));
  const deletedIn = new Map(
    tombstones.map((tombstone) => [entityKey(tombstone), tombstone.accessScopeId]),
  );
  const journalled = new Set(journalledTables());
  const verifySignature = createWriterFrameVerifier(db);
  const owed: EncryptedSyncFrame[] = [];
  for (const frame of frames) {
    if (frame.kind !== 'delete' || recorded.has(String(frame.operationId))) continue;
    // A frame naming a table peers do not own describes nothing to keep.
    if (!journalled.has(frame.entityTable)) continue;
    const scope = await currentScope({ db, frame, deletedIn });
    if (scope === undefined || scope === frame.accessScopeId) continue;
    const entry = await db.syncInbox.get(String(frame.operationId));
    const admitted = (await admittedFrame({ db, candidate: frame, verifySignature }))
      ?? (await acceptedEarlier({ db, candidate: frame, entry }));
    if (admitted) owed.push(admitted);
  }
  return owed;
};
