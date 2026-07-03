/**
 * The `db.meta` key marking that a document's CRDT state has been seeded. Shared
 * by the collab store (which writes it in `trySeed`) and the deletion paths
 * (which must clear it), so the two never drift out of sync.
 */
export const collabSeedKey = (docId: string): string => `collab-seed:${docId}`;
