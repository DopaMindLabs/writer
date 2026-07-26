import { STORES } from '@/db/stores';
import { rowEnvelopeTables } from '@/lib/writerSync/writerTablePolicy';

/**
 * Which tables sync, and which of their fields must stay plaintext. The
 * encrypted-table set derives from the authoritative
 * {@link import('@/lib/writerSync/writerTablePolicy').WRITER_TABLE_POLICIES | table policy}
 * (row-envelope classification), and plaintext fields derive from the
 * {@link STORES} schema, so neither can drift from its source of truth: a field
 * is plaintext iff it is the primary key, an index (indexes must be queryable,
 * so they cross the wire in the clear by design), a cloud-reserved property,
 * routing metadata, or the cipher envelope itself. Everything else top-level is
 * encrypted.
 */
export const SYNCED_TABLES: readonly string[] = rowEnvelopeTables();

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
  SYNCED_TABLES.includes(table);

export const plaintextFieldsFor = (table: string): ReadonlySet<string> => {
  const fields = schemaFields(STORES[table] ?? '');
  for (const reserved of CLOUD_RESERVED) fields.add(reserved);
  for (const field of ROUTING_METADATA) fields.add(field);
  return fields;
};
