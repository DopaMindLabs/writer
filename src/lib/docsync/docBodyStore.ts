import { newId } from '@/lib/ids';
import { yjsEngine } from './adapters/yjs/yjsEngine';
import { dexieUpdateLog } from './dexieUpdateLog';
import type {
  DocSyncEngine,
  DocSyncSession,
  EngineDoc,
  UpdateLog,
  UpdateLogState,
} from './ports';

/**
 * Composition root for the doc-sync foundation. The rest of the app opens,
 * invalidates, and deletes document sync state through this module only —
 * which engine and which log are in play is decided here and nowhere else.
 */
export interface DocSyncDeps {
  readonly engine: DocSyncEngine;
  readonly log: UpdateLog;
}

const defaultDeps: DocSyncDeps = { engine: yjsEngine, log: dexieUpdateLog };

interface OpenedDoc {
  readonly doc: EngineDoc;
  readonly state: UpdateLogState;
}

const openValidated = async (
  docId: string,
  deps: DocSyncDeps,
): Promise<OpenedDoc> => {
  try {
    const state = await deps.log.load(docId);
    const doc = deps.engine.open(state.updates.map((u) => u.update));
    return { doc, state };
  } catch (err) {
    // A corrupt update would otherwise poison every future load; clear the
    // stored state and let the editor reseed from the doc body projection.
    console.error(
      `Discarding corrupt doc sync state for ${docId}; it will reseed from the document body`,
      err,
    );
    await deps.log.invalidate(docId);
    const fresh = await deps.log.load(docId);
    return { doc: deps.engine.open([]), state: fresh };
  }
};

export const openDocSyncSession = async (
  docId: string,
  deps: DocSyncDeps = defaultDeps,
): Promise<DocSyncSession> => {
  const { doc, state } = await openValidated(docId, deps);
  if (state.updates.length > 1) {
    await deps.log.compact(docId, {
      epoch: state.epoch,
      snapshot: doc.encodeSnapshot(),
      replaces: state.updates.map((u) => u.id),
    });
  }
  const unsubscribe = doc.onUpdate((update) => {
    void deps.log.append(docId, state.epoch, update).catch((err: unknown) => {
      console.error(`Failed to persist a doc sync update for ${docId}`, err);
    });
  });
  return {
    key: newId(),
    docId,
    epoch: state.epoch,
    handle: doc.handle,
    hasStoredState: state.updates.length > 0,
    close: () => {
      unsubscribe();
      doc.destroy();
    },
  };
};

/**
 * Discards a doc's sync state after its body projection was replaced
 * wholesale (revision restore, space restore). The next session reseeds from
 * the body; in-flight writers from the old state become harmless.
 */
export const invalidateDocSyncState = (docId: string): Promise<void> =>
  defaultDeps.log.invalidate(docId);

/** Garbage-collects sync state for docs that are being deleted for good. */
export const deleteDocSyncState = (docIds: readonly string[]): Promise<void> =>
  defaultDeps.log.deleteAll(docIds);
