import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import {
  assertAcceptableRemoteTime, compareTimestamps, type HybridLogicalTimestamp,
} from 'writer-sync/core';
import { verifyFrame } from 'writer-sync/operations';
import { requireJournalledTable, UntrustedFrameError } from './frameAdmission';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { scopeEntityKey } from './scopeRebindingSnapshot';
import type { RebindingSnapshot, ScopeEntityState } from './scopeRebinding.types';

export const scopeStateTime = (state: ScopeEntityState): HybridLogicalTimestamp | undefined =>
  state.row?.logicalUpdatedAt ?? state.tombstone?.logicalAt;

const admitState = (state: ScopeEntityState, snapshot: RebindingSnapshot): void => {
  invariant(!(state.row && state.tombstone), 'Scope move found both a row and its tombstone');
  const time = scopeStateTime(state);
  if (time) {
    invariant(Number.isFinite(time.millis) && Number.isSafeInteger(time.counter) && time.counter >= 0,
      'Invalid scope-move logical time');
    assertAcceptableRemoteTime(time, () => Date.now());
  }
  const tomb = state.tombstone;
  if (!tomb) return;
  const original = snapshot.history.find((frame) => frame.operationId === tomb.operationId);
  invariant(original?.kind === 'delete' && original.entityTable === state.entityTable &&
    original.entityId === state.entityId && original.accessScopeId === tomb.accessScopeId &&
    original.deviceId === tomb.deviceId && compareTimestamps(original.logicalAt, tomb.logicalAt) === 0,
  'Scope move requires the retained signed frame for the current tombstone');
};

/** A received frame is not current state until materialisation has considered it. */
const assertMaterialised = (snapshot: RebindingSnapshot): void => {
  const accepted = new Set(snapshot.inbox.map((entry) => entry.operationId));
  const states = new Map(snapshot.entities.map((state) => [scopeEntityKey(state), state]));
  for (const frame of snapshot.history) {
    if (accepted.has(frame.operationId)) continue;
    const state = states.get(scopeEntityKey(frame));
    invariant(state, 'Scope move lost an entity from its snapshot');
    const currentId = state.row?.mutationId ?? state.tombstone?.operationId;
    if (currentId === frame.operationId) continue;
    const time = scopeStateTime(state);
    // The row has no origin device field, so equal clocks are ambiguous until
    // normal materialisation resolves the device tie-breaker.
    invariant(time && compareTimestamps(frame.logicalAt, time) < 0,
      'Scope move has pending operations; materialise them before retrying');
  }
};

/** Retained history is evidence to admit or refuse, never content to re-author. */
export const admitRebindingSnapshot = async (options: {
  db: LoremDB;
  snapshot: RebindingSnapshot;
}): Promise<void> => {
  const { db, snapshot } = options;
  const verifySignature = createWriterFrameVerifier(db);
  for (const candidate of snapshot.history) {
    const frame = await verifyFrame(candidate);
    requireJournalledTable(db, frame.entityTable);
    if (!(await verifySignature(frame))) throw new UntrustedFrameError(String(frame.deviceId));
    assertAcceptableRemoteTime(frame.logicalAt, () => Date.now());
  }
  for (const state of snapshot.entities) admitState(state, snapshot);
  assertMaterialised(snapshot);
};
