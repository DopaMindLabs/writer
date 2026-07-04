import { STORES } from '@/db/stores';

/**
 * Which tables sync, and which of their fields must stay plaintext. Derived from
 * the {@link STORES} schema so the encryption layer and the schema can never
 * drift: a field is plaintext iff it is the primary key, an index (indexes must
 * be queryable, so they cross the wire in the clear by design), a cloud-reserved
 * property, or the cipher envelope itself. Everything else top-level is encrypted.
 */
export const SYNCED_TABLES = [
  'spaces',
  'sections',
  'docs',
  'notes',
  'noteAttachments',
  'annotations',
  'citations',
  'connections',
  'revisions',
  'palettes',
] as const;

/** The field carrying the encrypted envelope on a sealed row. */
export const CIPHER_FIELD = '$lipsumCipher';

const CLOUD_RESERVED = ['realmId', 'owner', CIPHER_FIELD] as const;

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
  (SYNCED_TABLES as readonly string[]).includes(table);

export const plaintextFieldsFor = (table: string): ReadonlySet<string> => {
  const fields = schemaFields(STORES[table] ?? '');
  for (const reserved of CLOUD_RESERVED) fields.add(reserved);
  return fields;
};
