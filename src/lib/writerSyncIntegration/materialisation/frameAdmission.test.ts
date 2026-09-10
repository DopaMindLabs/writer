import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { journalledTables } from '@/lib/writerSyncIntegration/writerTablePolicy';
import {
  DisallowedOperationTableError,
  requireJournalledTable,
} from './frameAdmission';

let db: LoremDB;

beforeEach(async () => {
  db = new LoremDB('frame-admission');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('requireJournalledTable', () => {
  it('accepts every table the policy journals', () => {
    for (const table of journalledTables()) {
      expect(requireJournalledTable(db, table).name).toBe(table);
    }
  });

  it.each([
    ['cloudCrypto'],
    ['cloudDevices'],
    ['trustedDevices'],
    ['settings'],
    ['docUpdates'],
    ['syncInbox'],
    ['syncTombstones'],
  ])('refuses the control table %s', (table) => {
    expect(() => requireJournalledTable(db, table)).toThrow(
      DisallowedOperationTableError,
    );
  });

  it.each([['syncOperations'], ['syncAttachmentChunks']])(
    'refuses %s, replicated but not itself journalled',
    (table) => {
      expect(() => requireJournalledTable(db, table)).toThrow(
        DisallowedOperationTableError,
      );
    },
  );

  it('refuses a table this app does not know', () => {
    expect(() => requireJournalledTable(db, 'not-a-table')).toThrow(
      DisallowedOperationTableError,
    );
  });
});
