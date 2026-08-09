import { STORES } from '@/db/stores';
import {
  journalledTables,
  rowEnvelopeTables,
} from '@/lib/writerSyncIntegration/writerTablePolicy';

/**
 * Which tables the encryption middleware covers, which of their fields must
 * stay plaintext, and which tables are domain content. All three derive from
 * the authoritative
 * {@link import('@/lib/writerSyncIntegration/writerTablePolicy').WRITER_TABLE_POLICIES | table policy}
 * or the {@link STORES} schema, so none can drift from its source of truth: a
 * field is plaintext iff it is the primary key, an index (indexes must be
 * queryable, so they cross the wire in the clear by design), a cloud-reserved
 * property, routing metadata, or the cipher envelope itself. Everything else
 * top-level is encrypted.
 */

/**
 * Encryption middleware coverage — every table whose rows are sealed in the row
 * envelope. Strictly an encryption concept: being in this set says nothing
 * about whether the provider replicates the table directly or its rows are
 * user content.
 */
export const ROW_ENVELOPE_TABLES: readonly string[] = rowEnvelopeTables();

/**
 * Domain content with a materialised/journalled lifecycle — the set that
 * participates in seal-existing-rows, plaintext-content checks, adoption
 * re-seals and the erase escape hatch. A row-envelope control table (the
 * account device identity registry) is deliberately *not* content: adopting,
 * erasing or re-sealing it as though it were a document would rewrite trust
 * records outside their own authenticated write path.
 */
export const CONTENT_TABLES: readonly string[] = journalledTables();

/** The field carrying the encrypted envelope on a sealed row. */
export const CIPHER_FIELD = '$lipsumCipher';

const CLOUD_RESERVED = ['realmId', 'owner', CIPHER_FIELD] as const;

/**
 * Provider-neutral routing and convergence metadata that must be readable
 * *before* content decryption: a provider routes a frame by scope, deduplicates
 * by mutation id and orders changes by logical time without ever holding a
 * content key. Deliberately excludes `createdBy`/`updatedBy` — attribution
 * names a person and is sealed with the rest of the row.
 */
const ROUTING_METADATA = ['accessScopeId', 'mutationId', 'logicalUpdatedAt'] as const;

/** Parse a Dexie schema spec into its primary-key and index field names. */
const schemaFields = (spec: string): Set<string> => {
  const fields = new Set<string>();
  for (const raw of spec.split(',')) {
    const token = raw.trim().replace(/^\+\+/, '').replace(/^&/, '');
    if (token === '') continue;
    if (token.startsWith('[') && token.endsWith(']')) {
      for (const member of token.slice(1, -1).split('+')) {
        fields.add(member.trim());
      }
    } else {
      fields.add(token);
    }
  }
  return fields;
};

export const isEncryptedTable = (table: string): boolean =>
  ROW_ENVELOPE_TABLES.includes(table);

export const plaintextFieldsFor = (table: string): ReadonlySet<string> => {
  const fields = schemaFields(STORES[table] ?? '');
  for (const reserved of CLOUD_RESERVED) fields.add(reserved);
  for (const field of ROUTING_METADATA) fields.add(field);
  return fields;
};
