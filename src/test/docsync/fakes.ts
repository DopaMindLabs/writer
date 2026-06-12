import type {
  DocSyncEngine,
  EditorBindingHandle,
  EngineDoc,
  StoredUpdate,
  UpdateLog,
} from '@/lib/docsync/ports';

/**
 * In-memory test doubles for the doc-sync ports. The fake update log passes
 * the same contract suite as the Dexie adapter (`updateLogContract.ts`), so
 * store-level tests built on it exercise real port semantics.
 */

interface FakeRow {
  id: number;
  docId: string;
  epoch: number;
  update: Uint8Array;
}

export interface FakeUpdateLog extends UpdateLog {
  rows: (docId: string) => readonly StoredUpdate[];
}

export const createFakeUpdateLog = (): FakeUpdateLog => {
  let nextId = 1;
  let rows: FakeRow[] = [];
  const epochs = new Map<string, number>();
  const epochOf = (docId: string) => epochs.get(docId) ?? 0;

  return {
    load: async (docId) => {
      const epoch = epochOf(docId);
      rows = rows.filter((r) => r.docId !== docId || r.epoch === epoch);
      const updates = rows
        .filter((r) => r.docId === docId)
        .map(({ id, epoch: rowEpoch, update }) => ({
          id,
          epoch: rowEpoch,
          update,
        }));
      return Promise.resolve({ epoch, updates });
    },
    append: async (docId, epoch, update) => {
      rows.push({ id: nextId++, docId, epoch, update });
      return Promise.resolve();
    },
    compact: async (docId, { epoch, snapshot, replaces }) => {
      rows = rows.filter(
        (r) => r.docId !== docId || !replaces.includes(r.id),
      );
      rows.push({ id: nextId++, docId, epoch, update: snapshot });
      return Promise.resolve();
    },
    invalidate: async (docId) => {
      epochs.set(docId, epochOf(docId) + 1);
      rows = rows.filter((r) => r.docId !== docId);
      return Promise.resolve();
    },
    deleteAll: async (docIds) => {
      rows = rows.filter((r) => !docIds.includes(r.docId));
      for (const docId of docIds) epochs.delete(docId);
      return Promise.resolve();
    },
    rows: (docId) =>
      rows
        .filter((r) => r.docId === docId)
        .map(({ id, epoch, update }) => ({ id, epoch, update })),
  };
};

/** Updates whose first byte equals this make the fake engine's open throw. */
export const FAKE_CORRUPT_BYTE = 0xff;

export interface FakeEngineDoc extends EngineDoc {
  applied: Uint8Array[];
  destroyed: boolean;
  /** Simulates the engine producing an update (e.g. a local edit). */
  emit: (update: Uint8Array) => void;
}

export interface FakeEngine extends DocSyncEngine {
  opened: FakeEngineDoc[];
}

export const createFakeEngine = (): FakeEngine => {
  const opened: FakeEngineDoc[] = [];
  return {
    opened,
    open: (updates) => {
      for (const update of updates) {
        if (update[0] === FAKE_CORRUPT_BYTE) {
          throw new Error('corrupt update');
        }
      }
      const listeners = new Set<(update: Uint8Array) => void>();
      const doc: FakeEngineDoc = {
        applied: [...updates],
        destroyed: false,
        emit: (update) => {
          doc.applied.push(update);
          for (const listener of listeners) listener(update);
        },
        handle: undefined as unknown as EditorBindingHandle,
        encodeSnapshot: () => {
          const size = doc.applied.reduce((n, u) => n + u.byteLength, 0);
          const snapshot = new Uint8Array(size);
          let offset = 0;
          for (const u of doc.applied) {
            snapshot.set(u, offset);
            offset += u.byteLength;
          }
          return snapshot;
        },
        onUpdate: (listener) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        destroy: () => {
          doc.destroyed = true;
          listeners.clear();
        },
      };
      (doc as { handle: EditorBindingHandle }).handle =
        doc as unknown as EditorBindingHandle;
      opened.push(doc);
      return doc;
    },
  };
};
