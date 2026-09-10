/**
 * Dexie-specific metadata carried by a *persisted* row, kept off the domain
 * entity. `realmId` and `owner` are Dexie Cloud's own access-control fields — a
 * realm binding and an authorisation-override owner — and belong only to the
 * adapter. They are never audit attribution: Writer's `createdBy`/`updatedBy`
 * (see {@link ReplicatedEntityMetadata}) must never be mapped onto `owner`.
 */
export interface DexieRowMetadata {
  /** The Dexie Cloud realm this row is bound to; absent means the private realm. */
  realmId?: string;
  /** Dexie's authorisation-override owner — an access grant, not attribution. */
  owner?: string;
}

/**
 * A domain entity `T` as persisted through the Dexie Cloud adapter: the
 * provider-neutral row intersected with optional Dexie metadata. Adapter code
 * that stamps a realm works against this type; domain code never sees it.
 */
export type DexieRow<T> = T & DexieRowMetadata;
