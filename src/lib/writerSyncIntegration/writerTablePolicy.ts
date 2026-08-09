/**
 * The single authoritative classification of every Writer table: how it
 * replicates, how it is encrypted, which access-scope kind its rows resolve to,
 * and whether its mutations enter the generic operation journal.
 *
 * Replication, encryption and scope fan-out previously lived in three
 * independent lists (`SYNCED_TABLES`, `UNSYNCED` and a hand-maintained realm
 * table list) that could drift apart silently. Those consumers now derive from
 * this policy, and the policy's own test fails when a table is added without
 * being classified.
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
  /**
   * The binary field whose content is sealed once, chunked and carried by the
   * chunk store rather than inside the row's frame payload. Set only on tables
   * whose blobs outgrow a transport message; `revisions.payload` deliberately
   * stays fat-framed for now — an oversized revision is skipped with a report
   * (`onUndeliverableFrame`) rather than chunked, a recorded limit.
   */
  chunkedBlobField?: string;
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
  encryption: 'already-wrapped' | 'plaintext-control' | 'row-envelope',
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
  { ...content('noteAttachments', 'space'), chunkedBlobField: 'blob' },
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
  // encryption must not touch it; the plaintext rows are the provider's own
  // control data (device registry, Dexie realm and membership records). The
  // account device identity registry is Writer's own control table: directly
  // replicated like the rest, but row-envelope sealed under the account key so
  // the provider carries only authenticated ciphertext — that seal is what
  // makes a record proof of authorisation by an account-key holder.
  providerControl('cloudCrypto', 'already-wrapped'),
  providerControl('cloudDevices', 'plaintext-control'),
  providerControl('accountDeviceIdentities', 'row-envelope'),
  providerControl('realms', 'plaintext-control'),
  providerControl('members', 'plaintext-control'),
  // The operation protocol. `syncOperations` is the provider-neutral replicated
  // store: append-only frames whose payloads are already encrypted, so row
  // encryption must not touch them. Inbox, tombstones and provider bindings are
  // receiver-local state and never leave the device.
  {
    table: 'syncOperations',
    replication: 'synced-content',
    encryption: 'already-wrapped',
    scope: 'space',
    operationJournal: false,
  },
  // Sealed attachment ciphertext, chunked for transfer. Replicated like the
  // journal — a cloud device needs the chunks to rebuild the blob a thin frame
  // names — and already encrypted, so row encryption must not touch it. Chunk
  // bytes are stored as base64 strings, not binary: the addon auto-offloads
  // binary values to blob storage, whose ref lifecycle is incompatible with
  // the middleware (see buildDb's largeStringThreshold note); strings stay
  // inline at a 1.33× cost that is accepted and recorded here.
  {
    table: 'syncAttachmentChunks',
    replication: 'synced-content',
    encryption: 'already-wrapped',
    scope: 'space',
    operationJournal: false,
  },
  localOnly('syncInbox'),
  localOnly('syncTombstones'),
  localOnly('syncProviderBindings'),
  // Which peers this device has paired with. Local-only and never replicated:
  // trust is a property of *this* device's relationships, and syncing it would
  // let one compromised peer extend trust to every other device.
  localOnly('trustedDevices'),
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

/** The binary field carried by the chunk store for `table`, if any. */
export const chunkedBlobFieldFor = (table: string): string | undefined =>
  byTable.get(table)?.chunkedBlobField;

/**
 * Row-envelope content tables resolving to the given scope kind — the set a
 * realm restamp fans out over. Deliberately excludes `syncOperations`: frames
 * are scope-bound but already wrapped, and their provider binding is a
 * `SyncProviderBinding`, never a per-row restamp.
 */
export const scopeGroup = (scope: 'space' | 'document'): string[] =>
  WRITER_TABLE_POLICIES.filter(
    (policy) => policy.encryption === 'row-envelope' && policy.scope === scope,
  ).map((policy) => policy.table);
