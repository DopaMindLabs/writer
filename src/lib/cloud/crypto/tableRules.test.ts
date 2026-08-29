import { describe, it, expect } from 'vitest';
import {
  journalledTables,
  rowEnvelopeTables,
} from '@/lib/writerSyncIntegration/writerTablePolicy';
import {
  CONTENT_TABLES,
  ROW_ENVELOPE_TABLES,
  CIPHER_FIELD,
  isEncryptedTable,
  plaintextFieldsFor,
} from './tableRules';

describe('tableRules', () => {
  it('marks only the synced content tables as encrypted', () => {
    expect(isEncryptedTable('docs')).toBe(true);
    expect(isEncryptedTable('notes')).toBe(true);
    // Local-only / internal tables are never encrypted.
    expect(isEncryptedTable('settings')).toBe(false);
    expect(isEncryptedTable('docUpdates')).toBe(false);
    expect(isEncryptedTable('meta')).toBe(false);
  });

  it('keeps the primary key, indexes, compound members and reserved props plaintext', () => {
    const docs = plaintextFieldsFor('docs');
    // docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]'
    expect(docs.has('id')).toBe(true);
    expect(docs.has('spaceId')).toBe(true);
    expect(docs.has('sectionId')).toBe(true);
    expect(docs.has('updatedAt')).toBe(true);
    // cloud-reserved + envelope
    expect(docs.has('realmId')).toBe(true);
    expect(docs.has('owner')).toBe(true);
    expect(docs.has(CIPHER_FIELD)).toBe(true);
    // a content field is NOT plaintext
    expect(docs.has('body')).toBe(false);
    expect(docs.has('name')).toBe(false);
  });

  it('extracts both members of a compound index', () => {
    const connections = plaintextFieldsFor('connections');
    // '... [spaceId+fromNoteId], [spaceId+toNoteId]'
    expect(connections.has('fromNoteId')).toBe(true);
    expect(connections.has('toNoteId')).toBe(true);
  });

  it('lists the ten journalled content tables as domain content', () => {
    expect([...CONTENT_TABLES]).toHaveLength(10);
    expect(CONTENT_TABLES).toContain('noteAttachments');
    expect(CONTENT_TABLES).not.toContain('backups');
  });

  it('keeps routing metadata plaintext so providers can route without a key', () => {
    for (const table of ROW_ENVELOPE_TABLES) {
      const fields = plaintextFieldsFor(table);
      expect(fields.has('accessScopeId')).toBe(true);
      expect(fields.has('mutationId')).toBe(true);
      expect(fields.has('logicalUpdatedAt')).toBe(true);
    }
  });

  it('seals attribution — createdBy and updatedBy are never plaintext', () => {
    for (const table of ROW_ENVELOPE_TABLES) {
      const fields = plaintextFieldsFor(table);
      expect(fields.has('createdBy')).toBe(false);
      expect(fields.has('updatedBy')).toBe(false);
    }
  });
});

describe('encryption coverage vs content lifecycle', () => {
  it('derives encryption coverage from the row-envelope classification', () => {
    expect([...ROW_ENVELOPE_TABLES].sort()).toEqual([...rowEnvelopeTables()].sort());
    for (const table of ROW_ENVELOPE_TABLES) {
      expect(isEncryptedTable(table)).toBe(true);
    }
  });

  it('derives the content lifecycle set from the journalled classification', () => {
    expect([...CONTENT_TABLES].sort()).toEqual([...journalledTables()].sort());
  });

  it('keeps the two sets independent concepts — content is the journalled subset', () => {
    // Every journalled content table is row-envelope encrypted, but the reverse
    // is not a given: a directly replicated encrypted control table (the account
    // device identity registry) is row-envelope without being domain content.
    for (const table of CONTENT_TABLES) {
      expect(ROW_ENVELOPE_TABLES).toContain(table);
    }
  });
});
