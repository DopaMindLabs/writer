/**
 * The mutual-exclusion gate for every sweep that applies sync-derived document
 * state. Two independent paths react to the same settled sync round: the frame
 *-ingestion sweep (`src/lib/writerSyncIntegration/materialization/frameIngestion.ts`)
 * and the cloud reconciler (`src/lib/cloud/reconcile.ts`). Each snapshots
 * document state up front, so one running while the other writes can invert a
 * winner and re-apply a stale body — which a mounted editor then autosaves
 * outbound with a later clock, propagating the rollback account-wide. Running
 * both under one lock makes each sweep see the other's completed writes, never
 * a torn intermediate state.
 */
const createSerialLock = (): (<T>(task: () => Promise<T>) => Promise<T>) => {
  let tail: Promise<void> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(() => task());
    // The chain must survive a failed task: keep the tail settled-only.
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
};

/**
 * Run `task` once every previously queued sync-apply task has settled. FIFO,
 * exclusive; a rejection releases the lock and propagates to the caller only.
 */
export const runUnderSyncApplyLock = createSerialLock();
