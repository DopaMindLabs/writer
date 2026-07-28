import type { AccessScopeId } from 'writer-sync/core';
import type { ScopeKeyResolver, SyncKeyRing } from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { isJournalledRow, type JournalledRow } from './journalledRow';
import { makePutFrame, signAuthoredFrames } from './writerOperationFactory';
import type { JournalIdentity } from './operationJournalMiddleware';

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

const framesForRows = ({
  ring,
  deviceId,
  entityTable,
  rows,
}: ScopeFramesOptions): Promise<EncryptedSyncFrame[]> =>
  Promise.all(rows.map((row) => makePutFrame({ ring, deviceId, entityTable, row })));

export const createWriterFullState =
  ({ db, resolver, identity }: WriterFullStateDeps) =>
  async (accessScopeId: AccessScopeId): Promise<EncryptedSyncFrame[]> => {
    if (!resolver.hasAnyKey()) return [];
    const { deviceId, privateKey } = await identity();
    const built: EncryptedSyncFrame[] = [];

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
      built.push(...(await framesForRows({ ring, deviceId, entityTable, rows })));
    }

    return signAuthoredFrames(privateKey, built);
  };
