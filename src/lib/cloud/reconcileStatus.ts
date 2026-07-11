/**
 * A tiny synchronous store for the outcome of the last document-reconciliation
 * run, so cloud settings can distinguish *slow* sync from *failed* reconciliation
 * and offer a retry. It records only non-sensitive diagnostics — counts,
 * timings, a trigger, and a sanitised error string. It never holds a document
 * body, passphrase, recovery code, key, or ciphertext.
 *
 * Mirrors {@link import('./crypto/keylessLock').keylessLockState} in shape
 * (`current`/`set`/`subscribe`) so a `useSyncExternalStore` hook can surface it.
 */

/** What prompted a reconcile run. */
export type ReconcileTrigger =
  | 'initial'
  | 'pull'
  | 'sync-complete'
  | 'key-acquired'
  | 'manual';

interface ReconcileCounts {
  /** Documents in the library this run scanned. */
  scanned: number;
  /** Documents skipped because their body was unchanged since last reconcile. */
  skipped: number;
  /** Documents whose pulled body was reconciled into the editor/CRDT. */
  reconciled: number;
  /** Documents whose reconciliation threw (isolated; the sweep continued). */
  failed: number;
  /** Time to finish the mounted (active) documents, or `null` if none mounted. */
  activeDocLatencyMs: number | null;
}

interface RunMeta {
  trigger: ReconcileTrigger;
  runId: number;
  startedAt: number;
  /** Whether a follow-up run was queued while this one was in flight. */
  queued: boolean;
}

interface FinishedMeta extends RunMeta, ReconcileCounts {
  endedAt: number;
  durationMs: number;
}

export type ReconcileStatus =
  | { state: 'idle' }
  | ({ state: 'running' } & RunMeta)
  | ({ state: 'succeeded' } & FinishedMeta)
  | ({ state: 'failed'; error: string } & FinishedMeta);

/** Reduce any thrown value to a short, content-free diagnostic string. */
export const sanitiseReconcileError = (error: unknown): string => {
  if (error instanceof Error) {
    const name = error.name || 'Error';
    return error.message ? `${name}: ${error.message.slice(0, 200)}` : name;
  }
  return 'Unknown error';
};

let status: ReconcileStatus = { state: 'idle' };
const listeners = new Set<() => void>();

export const reconcileStatus = {
  /** Synchronous read for `useSyncExternalStore` and diagnostics. */
  current: (): ReconcileStatus => status,
  /** Replace the status and notify subscribers. */
  set: (next: ReconcileStatus): void => {
    status = next;
    for (const listener of listeners) listener();
  },
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
