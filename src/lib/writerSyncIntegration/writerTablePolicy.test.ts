import { describe, expect, it } from 'vitest';
import { STORES } from '@/db/stores';
import {
  WRITER_TABLE_POLICIES,
  chunkedBlobFieldFor,
  journalledTables,
  localOnlyTables,
  policyFor,
  rowEnvelopeTables,
  scopeGroup,
} from './writerTablePolicy';

describe('writerTablePolicy coverage', () => {
  it('classifies every STORES table — adding a table without a policy fails', () => {
    for (const table of Object.keys(STORES)) {
      expect(policyFor(table), `missing policy for table: ${table}`).toBeDefined();
    }
  });

  it('classifies the provider control tables the cloud schema adds', () => {
    for (const table of ['cloudCrypto', 'cloudDevices', 'realms', 'members']) {
      expect(policyFor(table)?.replication).toBe('provider-control');
    }
  });

  it('has no policy for a table that exists nowhere', () => {
    expect(policyFor('imaginary')).toBeUndefined();
  });

  it('names each table exactly once', () => {
    const names = WRITER_TABLE_POLICIES.map((policy) => policy.table);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('classification invariants', () => {
  it('journals only tables that are scope-resolvable and encrypted', () => {
    for (const table of journalledTables()) {
      const policy = policyFor(table);
      expect(policy?.encryption).toBe('row-envelope');
      expect(policy?.scope).not.toBe('local');
    }
  });

  it('keeps docUpdates local-only and outside the generic operation journal', () => {
    const policy = policyFor('docUpdates');
    expect(policy?.replication).toBe('local-only');
    expect(policy?.operationJournal).toBe(false);
  });

  it('never replicates a local-scope table', () => {
    for (const policy of WRITER_TABLE_POLICIES) {
      if (policy.scope === 'local') {
        expect(policy.replication).toBe('local-only');
        expect(policy.encryption).toBe('none');
      }
    }
  });

  it('row-envelope encryption appears only on synced content', () => {
    for (const policy of WRITER_TABLE_POLICIES) {
      if (policy.encryption === 'row-envelope') {
        expect(policy.replication).toBe('synced-content');
      }
    }
  });

  it('keeps the escrow already-wrapped, never row-envelope encrypted', () => {
    expect(policyFor('cloudCrypto')?.encryption).toBe('already-wrapped');
  });
});

describe('derived sets match the established behaviour', () => {
  it('derives the thirteen row-envelope content tables', () => {
    expect([...rowEnvelopeTables()].sort()).toEqual(
      [
        'annotations',
        'citations',
        'connections',
        'docs',
        'noteAttachments',
        'notes',
        'palettes',
        'revisions',
        'sections',
        'spaces',
        'writerNotebookAssets',
        'writerNotebookPages',
        'writerNotebooks',
      ].sort(),
    );
  });

  it('derives the local-only tables that never leave the device', () => {
    expect([...localOnlyTables()].sort()).toEqual(
      [
        'backups',
        'docInspectorConfigs',
        'docUpdates',
        'meta',
        'settings',
        'syncConfigs',
        'syncInbox',
        'syncProviderBindings',
        'syncTombstones',
        'syncs',
        'trustedDevices',
      ].sort(),
    );
  });

  it('replicates the operation journal as already-wrapped frames', () => {
    const policy = policyFor('syncOperations');
    expect(policy?.replication).toBe('synced-content');
    expect(policy?.encryption).toBe('already-wrapped');
    expect(policy?.operationJournal).toBe(false);
  });

  it('groups synced content by scope for realm fan-out', () => {
    expect(scopeGroup('document').sort()).toEqual(['annotations', 'revisions']);
    expect(scopeGroup('space')).toContain('sections');
    expect(scopeGroup('space')).toContain('palettes');
    expect(scopeGroup('space')).not.toContain('annotations');
    expect(scopeGroup('space')).not.toContain('cloudDevices');
  });

  it('journals every synced content table today', () => {
    expect([...journalledTables()].sort()).toEqual([...rowEnvelopeTables()].sort());
  });

  it('replicates attachment chunks as already-wrapped ciphertext', () => {
    const policy = policyFor('syncAttachmentChunks');
    expect(policy?.replication).toBe('synced-content');
    expect(policy?.encryption).toBe('already-wrapped');
    expect(policy?.operationJournal).toBe(false);
  });

  it('chunks the two synced binary-asset tables', () => {
    // revisions.payload stays fat-framed deliberately: an oversized revision is
    // skipped with a report rather than chunked — a recorded limit.
    expect(chunkedBlobFieldFor('noteAttachments')).toBe('blob');
    expect(chunkedBlobFieldFor('writerNotebookAssets')).toBe('blob');
    const flagged = WRITER_TABLE_POLICIES.filter(
      (policy) => policy.chunkedBlobField !== undefined,
    );
    expect(flagged.map((policy) => policy.table)).toEqual([
      'noteAttachments',
      'writerNotebookAssets',
    ]);
  });
});
