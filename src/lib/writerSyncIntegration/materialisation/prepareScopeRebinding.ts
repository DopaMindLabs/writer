import { invariant } from '@/lib/invariant';
import { newId } from '@/lib/ids';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { chunkedBlobFieldFor, journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { asOperationId } from 'writer-sync/core';
import { MAX_ATTACHMENT_BYTES } from 'writer-sync/operations';
import { prepareFramePayload } from './attachmentFramePayload';
import { scopeStateTime } from './scopeRebindingAdmission';
import { makeDeleteFrame, makePutFrame, signAuthoredFrames } from './writerOperationFactory';
import type { JournalIdentity } from './operationJournalMiddleware';
import type {
  PreparedScopeEntity, RebindingSnapshot, ScopeEntityState, ScopeRebindingOptions,
} from './scopeRebinding.types';

/**
 * The most attachment content one move carries. Every attachment's ciphertext
 * is held until the move commits, so a move within this holds no more than one
 * attachment of the largest size a transfer allows.
 */
export const MAX_SCOPE_MOVE_ATTACHMENT_BYTES = MAX_ATTACHMENT_BYTES;

/** The move carries more attachment content than it can hold before it commits. */
export class ScopeRebindingTooLargeError extends Error {
  constructor(bytes: number) {
    super(`A scope move carries at most ${String(MAX_SCOPE_MOVE_ATTACHMENT_BYTES)} bytes of attachments, not ${String(bytes)}`);
    this.name = 'ScopeRebindingTooLargeError';
  }
}

/**
 * Keyless row reads are hidden by encryption middleware, not an empty scope, and
 * a resolver answers per table: every content table must be readable in the
 * source and writable in the destination before the snapshot is believed.
 */
export const requireScopeMoveKeys = (move: ScopeRebindingOptions): void => {
  for (const table of journalledTables()) {
    const context = { table, primaryKey: '' };
    const source = move.resolver.keyFor({
      ...context, accessScopeId: move.scopes.from, operation: 'read',
    });
    const destination = move.resolver.keyFor({
      ...context, accessScopeId: move.scopes.to, operation: 'write',
    });
    invariant(source && destination,
      'rescopeFrames: both the source and destination scope keys must be available');
  }
};

/**
 * A row the encryption middleware hides is not absent from the scope. One stored
 * in the source scope is a source row this device cannot open, whether no key
 * resolves for it or the key that does fails to open it. A move that went ahead
 * would record a completed receipt with the row left behind, so the move waits
 * until the source can be read in full.
 */
export const requireReadableSource = (snapshot: RebindingSnapshot): void => {
  const tables = [...new Set(snapshot.hidden.map(({ entityTable }) => entityTable))];
  invariant(tables.length === 0, () =>
    `rescopeFrames: ${tables.join(', ')} rows in the source scope do not open, so the scope cannot be read in full`);
};

const prepareEntity = async (options: {
  move: ScopeRebindingOptions;
  state: ScopeEntityState;
  author: JournalIdentity;
}): Promise<PreparedScopeEntity> => {
  const { move, state, author: { deviceId, privateKey } } = options;
  const keyFor = (accessScopeId: string, operation: 'read' | 'write') => move.resolver.keyFor({
    table: state.entityTable, primaryKey: state.entityId, accessScopeId, operation,
  });
  const missing = 'rescopeFrames: both the source and destination scope keys must be available';
  const source = keyFor(move.scopes.from, 'read');
  const ring = keyFor(move.scopes.to, 'write');
  invariant(source && ring, missing);
  if (!state.row) {
    const frame = makeDeleteFrame({ ring, deviceId, entityTable: state.entityTable,
      entityId: state.entityId, accessScopeId: move.scopes.to });
    const [signed] = await signAuthoredFrames(privateKey, [frame]);
    return { frame: signed, withdrawal: null, row: null, chunks: [] };
  }
  // Withdrawn from the source before it arrives in the destination. A device
  // that reads only the source never sees the destination put, and must lose
  // the row rather than keep a copy whose next edit would move it back; one
  // that reads both sees the later put win, whichever frame reaches it first.
  const withdrawing = keyFor(move.scopes.from, 'write');
  invariant(withdrawing, missing);
  const withdrawal = makeDeleteFrame({ ring: withdrawing, deviceId, entityTable: state.entityTable,
    entityId: state.entityId, accessScopeId: move.scopes.from });
  const row = { ...state.row, accessScopeId: move.scopes.to,
    mutationId: asOperationId(newId()), logicalUpdatedAt: writerClock.now() };
  const payload = await prepareFramePayload({ entityTable: state.entityTable, row, ring });
  const frame = await makePutFrame({ ring, deviceId, entityTable: state.entityTable, row: payload.row });
  const [signedWithdrawal, signed] = await signAuthoredFrames(privateKey, [withdrawal, frame]);
  return { frame: signed, withdrawal: signedWithdrawal, row, chunks: payload.chunks };
};

const attachmentBytes = ({ entityTable, row }: ScopeEntityState): number => {
  const field = chunkedBlobFieldFor(entityTable);
  const blob = field === undefined ? undefined : row?.[field];
  return blob instanceof Blob ? blob.size : 0;
};

/**
 * Encryption and signatures finish before opening the commit transaction. One
 * entity is prepared at a time, and a move over the attachment limit is refused
 * before any content is read.
 */
export const prepareScopeRebinding = async (options: {
  move: ScopeRebindingOptions;
  states: readonly ScopeEntityState[];
}): Promise<PreparedScopeEntity[]> => {
  const { move, states } = options;
  if (states.length === 0) return [];
  const bytes = states.reduce((total, state) => total + attachmentBytes(state), 0);
  if (bytes > MAX_SCOPE_MOVE_ATTACHMENT_BYTES) throw new ScopeRebindingTooLargeError(bytes);
  const author = await move.identity();
  for (const state of states) {
    const time = scopeStateTime(state);
    invariant(time, 'Scope move requires a current row or tombstone');
    writerClock.observe(time);
  }
  const prepared: PreparedScopeEntity[] = [];
  for (const state of states) prepared.push(await prepareEntity({ move, state, author }));
  return prepared;
};
