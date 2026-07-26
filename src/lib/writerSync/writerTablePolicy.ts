/**
 * The single authoritative classification of every Writer table: how it
 * replicates, how it is encrypted, which access-scope kind its rows resolve to,
 * and whether its mutations enter the generic operation journal.
 *
 * Replication, encryption and realm fan-out previously lived in three
 * independent lists (`SYNCED_TABLES`, `UNSYNCED`, `REALM_TABLE_NAMES`) that
 * could drift apart silently. Those consumers now derive from this policy, and
 * the policy's own test fails when a table is added without being classified.
 */

/** How a table's rows leave (or never leave) this device. */
export type TableReplication = 'synced-content' | 'provider-control' | 'local-only';

/** How a table's rows are protected at rest and on the wire. */
export type TableEncryption =
  | 'row-envelope'
  | 'already-wrapped'
  | 'plaintext-control'
  | 'none';

/** The access-scope kind a table's rows resolve to. */
export type TableScope = 'space' | 'document' | 'account' | 'local';

export interface WriterTablePolicy {
  table: string;
  replication: TableReplication;
  encryption: TableEncryption;
  scope: TableScope;
  /** Whether mutations of this table enter the generic operation journal. */
  operationJournal: boolean;
}

const content = (
  table: string,
  scope: 'space' | 'document',
): WriterTablePolicy => ({
  table,
  replication: 'synced-content',
  encryption: 'row-envelope',
  scope,
  operationJournal: true,
});

const localOnly = (table: string): WriterTablePolicy => ({
  table,
  replication: 'local-only',
  encryption: 'none',
  scope: 'local',
  operationJournal: false,
});

const providerControl = (
  table: string,
  encryption: 'already-wrapped' | 'plaintext-control',
): WriterTablePolicy => ({
  table,
  replication: 'provider-control',
  encryption,
  scope: 'account',
  operationJournal: false,
});

/**
 * One record per table. Covers the schema (`STORES`), the cloud-only stores the
 * database adds when the cloud schema is active (`cloudCrypto`, `cloudDevices`)
 * and the access-control tables the Dexie Cloud addon injects (`realms`,
 * `members`). The operation journal, inbox, binding and tombstone stores arrive
 * with the operation protocol (runbook slice 1E) and are classified here when
 * they are added.
 */
export const WRITER_TABLE_POLICIES: readonly WriterTablePolicy[] = [
  // Synced, row-envelope-encrypted content.
  content('spaces', 'space'),
  content('sections', 'space'),
  content('docs', 'space'),
  content('notes', 'space'),
  content('noteAttachments', 'space'),
  content('citations', 'space'),
  content('connections', 'space'),
  content('palettes', 'space'),
  content('annotations', 'document'),
  content('revisions', 'document'),
  // Local-only: preferences, backups, folder-sync bookkeeping and the per-doc
  // CRDT update log. None of these rows may ever leave the device.
  localOnly('settings'),
  localOnly('backups'),
  localOnly('syncs'),
  localOnly('syncConfigs'),
  localOnly('docInspectorConfigs'),
  localOnly('meta'),
  localOnly('docUpdates'),
  // Provider control tables. The escrow is already passphrase-wrapped, so row
  // encryption must not touch it; the rest are the provider's own plaintext
  // control rows (device registry, Dexie realm and membership records).
  providerControl('cloudCrypto', 'already-wrapped'),
  providerControl('cloudDevices', 'plaintext-control'),
  providerControl('realms', 'plaintext-control'),
  providerControl('members', 'plaintext-control'),
];

const byTable = new Map(WRITER_TABLE_POLICIES.map((policy) => [policy.table, policy]));

/** The policy for `table`, or `undefined` for a table this app does not know. */
export const policyFor = (table: string): WriterTablePolicy | undefined =>
  byTable.get(table);

/** Tables whose rows are sealed in the row envelope — the encrypted content set. */
export const rowEnvelopeTables = (): string[] =>
  WRITER_TABLE_POLICIES.filter((policy) => policy.encryption === 'row-envelope').map(
    (policy) => policy.table,
  );

/** Tables that must never leave the device. */
export const localOnlyTables = (): string[] =>
  WRITER_TABLE_POLICIES.filter((policy) => policy.replication === 'local-only').map(
    (policy) => policy.table,
  );

/** Tables whose mutations enter the generic operation journal. */
export const journalledTables = (): string[] =>
  WRITER_TABLE_POLICIES.filter((policy) => policy.operationJournal).map(
    (policy) => policy.table,
  );

/** Synced content tables resolving to the given scope kind. */
export const scopeGroup = (scope: 'space' | 'document'): string[] =>
  WRITER_TABLE_POLICIES.filter(
    (policy) => policy.replication === 'synced-content' && policy.scope === scope,
  ).map((policy) => policy.table);
