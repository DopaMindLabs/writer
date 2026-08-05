import type { Doc } from '@/db/schema';

/** The slice of a document reconciliation needs: its id and current row body. */
export type Reconcilable = Pick<Doc, 'id' | 'body'>;

export interface ReconcileResult {
  docId: string;
  /** `restored`/`reseeded`: pulled body applied. `kept-local`: unsaved local edits
   *  won, and the pulled body was preserved as a recoverable safety revision. */
  action: 'restored' | 'reseeded' | 'kept-local';
}

/**
 * What one pass of the mount gate did. `accepted` is the fourth outcome the
 * others cannot express: nothing needed doing because the log already equalled
 * the body.
 *
 * Callers driven by arriving sync frames branch on this — only a `reseeded`
 * lineage leaves other tabs holding a log that no longer exists, and so only
 * that outcome is worth telling them about.
 */
export type MountReconcileAction = ReconcileResult['action'] | 'accepted';

export interface ReconcileMountOptions {
  /**
   * Whether to mint the pre-sync safety revision when the losing CRDT holds
   * nothing the row does not already have.
   *
   * `keep` (the default) always mints it. `skip` mints one only for genuine
   * unsaved work — a snapshot that differs from the baseline, or a baseline too
   * damaged to prove anything. A body arriving from a paired device lands on
   * every pause in the other person's typing, and `revisions` replicates, so a
   * revision per hop would fill every device's history with copies of a
   * document nobody had edited.
   */
  cleanSnapshotRevision?: 'keep' | 'skip';
}
