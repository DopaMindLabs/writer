import { invariant } from '@/lib/invariant';
import { newId } from '@/lib/ids';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { asOperationId } from 'writer-sync/core';
import { prepareFramePayload } from './attachmentFramePayload';
import { scopeStateTime } from './scopeRebindingAdmission';
import { makeDeleteFrame, makePutFrame, signAuthoredFrames } from './writerOperationFactory';
import type { JournalIdentity } from './operationJournalMiddleware';
import type {
  PreparedScopeEntity, ScopeEntityState, ScopeRebindingOptions,
} from './scopeRebinding.types';

/** Keyless row reads are hidden by encryption middleware, not an empty scope. */
export const requireScopeMoveKeys = (move: ScopeRebindingOptions): void => {
  const context = { table: 'syncOperations', primaryKey: '' };
  const source = move.resolver.keyFor({
    ...context, accessScopeId: move.scopes.from, operation: 'read',
  });
  const destination = move.resolver.keyFor({
    ...context, accessScopeId: move.scopes.to, operation: 'write',
  });
  invariant(source && destination,
    'rescopeFrames: both the source and destination scope keys must be available');
};

const prepareEntity = async (options: {
  move: ScopeRebindingOptions;
  state: ScopeEntityState;
  author: JournalIdentity;
}): Promise<PreparedScopeEntity> => {
  const { move, state, author: { deviceId, privateKey } } = options;
  const context = { table: state.entityTable, primaryKey: state.entityId };
  const source = move.resolver.keyFor({
    ...context, accessScopeId: move.scopes.from, operation: 'read',
  });
  const ring = move.resolver.keyFor({
    ...context, accessScopeId: move.scopes.to, operation: 'write',
  });
  invariant(source && ring, 'rescopeFrames: both the source and destination scope keys must be available');
  if (!state.row) {
    const frame = makeDeleteFrame({ ring, deviceId, entityTable: state.entityTable,
      entityId: state.entityId, accessScopeId: move.scopes.to });
    const [signed] = await signAuthoredFrames(privateKey, [frame]);
    return { frame: signed, row: null, chunks: [] };
  }
  const row = { ...state.row, accessScopeId: move.scopes.to,
    mutationId: asOperationId(newId()), logicalUpdatedAt: writerClock.now() };
  const payload = await prepareFramePayload({ entityTable: state.entityTable, row, ring });
  const frame = await makePutFrame({ ring, deviceId, entityTable: state.entityTable, row: payload.row });
  const [signed] = await signAuthoredFrames(privateKey, [frame]);
  return { frame: signed, row, chunks: payload.chunks };
};

/** Encryption and signatures finish before opening the commit transaction. */
export const prepareScopeRebinding = async (options: {
  move: ScopeRebindingOptions;
  states: readonly ScopeEntityState[];
}): Promise<PreparedScopeEntity[]> => {
  const { move, states } = options;
  if (states.length === 0) return [];
  const author = await move.identity();
  for (const state of states) {
    const time = scopeStateTime(state);
    invariant(time, 'Scope move requires a current row or tombstone');
    writerClock.observe(time);
  }
  return Promise.all(states.map((state) => prepareEntity({ move, state, author })));
};
