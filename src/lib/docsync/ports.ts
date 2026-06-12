/**
 * Vendor-neutral ports for the document-sync foundation.
 *
 * The app talks to documents through these interfaces only; the concrete
 * CRDT library lives behind `DocSyncEngine` (see `adapters/yjs`) and the
 * storage behind `UpdateLog` (see `dexieUpdateLog`). Neither vendor type may
 * cross this boundary.
 */

declare const editorBindingHandleBrand: unique symbol;

/**
 * Opaque reference to the engine's live document. Only the matching editor
 * binding adapter may narrow it back to the vendor type.
 */
export interface EditorBindingHandle {
  readonly [editorBindingHandleBrand]: 'docsync-editor-binding';
}

export interface StoredUpdate {
  readonly id: number;
  readonly epoch: number;
  readonly update: Uint8Array;
}

export interface UpdateLogState {
  readonly epoch: number;
  readonly updates: readonly StoredUpdate[];
}

export interface UpdateLogCompaction {
  readonly epoch: number;
  readonly snapshot: Uint8Array;
  /** Ids of the stored updates the snapshot covers; only these are removed. */
  readonly replaces: readonly number[];
}

/**
 * Append-only log of opaque CRDT updates per document. `invalidate` bumps the
 * doc's epoch and clears its rows in one atomic step, so a stale writer (an
 * unmounted session or a second tab) can never resurrect replaced content:
 * its appends carry the old epoch and are discarded by the next `load`.
 */
export interface UpdateLog {
  readonly load: (docId: string) => Promise<UpdateLogState>;
  readonly append: (
    docId: string,
    epoch: number,
    update: Uint8Array,
  ) => Promise<void>;
  readonly compact: (
    docId: string,
    compaction: UpdateLogCompaction,
  ) => Promise<void>;
  readonly invalidate: (docId: string) => Promise<void>;
  readonly deleteAll: (docIds: readonly string[]) => Promise<void>;
}

export interface EngineDoc {
  readonly handle: EditorBindingHandle;
  readonly encodeSnapshot: () => Uint8Array;
  /** Subscribes to updates produced by the doc; returns the unsubscribe. */
  readonly onUpdate: (listener: (update: Uint8Array) => void) => () => void;
  readonly destroy: () => void;
}

export interface DocSyncEngine {
  /** Materialises a document from stored updates; throws on a corrupt one. */
  readonly open: (updates: readonly Uint8Array[]) => EngineDoc;
}

export interface DocSyncSession {
  /** Unique per session — key editor mounts on it so a new session remounts. */
  readonly key: string;
  readonly docId: string;
  readonly epoch: number;
  readonly handle: EditorBindingHandle;
  /** False when the doc had no valid stored state and must seed from its body. */
  readonly hasStoredState: boolean;
  readonly close: () => void;
}
