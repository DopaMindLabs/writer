import type { AccessScopeId } from 'writer-sync/core';
import type { ScopeKeyResolver, SyncKeyRing } from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import type { SyncAttachmentChunk } from '@/db/schema';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { isJournalledRow, type JournalledRow } from './journalledRow';
import { makePutFrame, signAuthoredFrames } from './writerOperationFactory';
import type { JournalIdentity } from './operationJournalMiddleware';
import { prepareFramePayload } from './attachmentFramePayload';

/**
 * Writer's answer to "what does this scope look like now?", for a peer whose
 * starting point the journal can no longer honestly serve — one that has never
 * synchronised, or has been away past the retention window.
 *
 * The reply is ordinary signed put frames, not an archive: a rebuilt frame must
 * be indistinguishable from a journalled one to everything downstream, or the
 * receiving device would need a second way to apply it and a second place for
 * that decision to go wrong. This is deliberately *not* the backup path, which
 * exports a snapshot for a human.
 *
 * A row is described only where a key resolves for its scope. A scope this
 * device cannot seal for is one it cannot serve — framing those rows in
 * plaintext would hand a peer content the pairing never authorised.
 *
 * **Absence describes nothing.** Rebuilt puts alone would tell a returning peer
 * what exists and leave it holding every row deleted while it was away — both
 * devices reporting "caught up" over different documents. The scope's retained
 * deletions therefore travel with them, as the frames their authors signed.
 */

export interface WriterFullStateDeps {
  db: LoremDB;
  resolver: ScopeKeyResolver;
  identity: () => Promise<JournalIdentity>;
}

/** The rows of one journalled table that belong to a scope. */
const rowsInScope = async (
  db: LoremDB,
  table: string,
  accessScopeId: AccessScopeId,
): Promise<JournalledRow[]> => {
  const rows: unknown[] = await db.table(table).toArray();
  return rows
    .filter((row): row is JournalledRow => isJournalledRow(row as Record<string, unknown>))
    .filter((row) => row.accessScopeId === accessScopeId);
};

interface ScopeFramesOptions {
  ring: SyncKeyRing;
  deviceId: JournalIdentity['deviceId'];
  entityTable: string;
  rows: readonly JournalledRow[];
}

interface ScopeFrames {
  frames: EncryptedSyncFrame[];
  chunks: SyncAttachmentChunk[];
}

const framesForRows = async ({
  ring,
  deviceId,
  entityTable,
  rows,
}: ScopeFramesOptions): Promise<ScopeFrames> => {
  const frames: EncryptedSyncFrame[] = [];
  const chunks: SyncAttachmentChunk[] = [];
  for (const row of rows) {
    const prepared = await prepareFramePayload({ entityTable, row, ring });
    frames.push(
      await makePutFrame({
        ring,
        deviceId,
        entityTable,
        row: prepared.row,
      }),
    );
    chunks.push(...prepared.chunks);
  }
  return { frames, chunks };
};

/** A tombstone whose signed delete frame the journal no longer holds. */
export class MissingRetainedDeleteError extends Error {
  constructor(operationId: string) {
    super(`The delete frame for retained operation ${operationId} is gone`);
    this.name = 'MissingRetainedDeleteError';
  }
}

/**
 * The deletions this scope still owes a returning peer, as originally signed.
 *
 * Served from the journal rather than rebuilt: a deletion is attributed to the
 * device that made it, and manufacturing a replacement here would put this
 * device's name and signature on someone else's decision. Compaction keeps a
 * delete frame for as long as its tombstone stands, so a missing one is a
 * broken retention rule and is reported rather than skipped — skipping it would
 * send a rebuild that silently omits a deletion, which is the failure this
 * whole path exists to prevent.
 */
const retainedDeletes = async (
  db: LoremDB,
  accessScopeId: AccessScopeId,
): Promise<EncryptedSyncFrame[]> => {
  const tombstones = await db.syncTombstones
    .where('accessScopeId')
    .equals(accessScopeId)
    .toArray();
  return Promise.all(
    tombstones.map(async ({ operationId }) => {
      const frame = await db.syncOperations.get(String(operationId));
      if (frame?.kind !== 'delete') {
        throw new MissingRetainedDeleteError(String(operationId));
      }
      return frame;
    }),
  );
};

export const createWriterFullState =
  ({ db, resolver, identity }: WriterFullStateDeps) =>
  async (accessScopeId: AccessScopeId): Promise<EncryptedSyncFrame[]> => {
    if (!resolver.hasAnyKey()) return [];
    const { deviceId, privateKey } = await identity();
    const built: EncryptedSyncFrame[] = [];
    const chunks: SyncAttachmentChunk[] = [];

    for (const entityTable of journalledTables()) {
      const rows = await rowsInScope(db, entityTable, accessScopeId);
      if (rows.length === 0) continue;
      // Resolved per table rather than once per scope: the resolver's contract
      // is per context, and a per-scope key is a resolver change this must not
      // pre-empt by asking only once.
      const ring = resolver.keyFor({
        accessScopeId,
        table: entityTable,
        primaryKey: rows[0].id,
        operation: 'write',
      });
      if (ring === null) continue;
      const prepared = await framesForRows({
        ring,
        deviceId,
        entityTable,
        rows,
      });
      built.push(...prepared.frames);
      chunks.push(...prepared.chunks);
    }

    const signed = await signAuthoredFrames(privateKey, built);
    if (chunks.length > 0) await db.syncAttachmentChunks.bulkPut(chunks);
    // Deletions travel beside the rows that survive, and a scope whose rows
    // were all deleted answers with deletions alone rather than with nothing.
    return [...signed, ...(await retainedDeletes(db, accessScopeId))];
  };
