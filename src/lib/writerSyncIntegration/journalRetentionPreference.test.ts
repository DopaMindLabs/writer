import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import {
  getJournalRetentionDays,
  setJournalRetentionDays,
} from './journalRetentionPreference';

beforeEach(async () => {
  await db.meta.delete('journalRetentionDays');
});

describe('journal retention preference', () => {
  it('defaults to thirty days when nothing is stored', async () => {
    await expect(getJournalRetentionDays()).resolves.toBe(30);
  });

  it('round-trips a configured window', async () => {
    await setJournalRetentionDays(90);

    await expect(getJournalRetentionDays()).resolves.toBe(90);
  });

  it('reads a malformed stored value as the default rather than failing', async () => {
    await db.meta.put({ key: 'journalRetentionDays', value: 'soon' });

    await expect(getJournalRetentionDays()).resolves.toBe(30);
  });

  it('refuses a window the policy would reject', async () => {
    await expect(setJournalRetentionDays(0)).rejects.toBeInstanceOf(RangeError);
    await expect(setJournalRetentionDays(1.5)).rejects.toBeInstanceOf(RangeError);
    await expect(setJournalRetentionDays(366)).rejects.toBeInstanceOf(RangeError);
  });
});
