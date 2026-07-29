import type { Doc } from '@/db/schema';

/** The slice of a document reconciliation needs: its id and current row body. */
export type Reconcilable = Pick<Doc, 'id' | 'body'>;

export interface ReconcileResult {
  docId: string;
  /** `restored`/`reseeded`: pulled body applied. `kept-local`: unsaved local edits
   *  won, and the pulled body was preserved as a recoverable safety revision. */
  action: 'restored' | 'reseeded' | 'kept-local';
}
