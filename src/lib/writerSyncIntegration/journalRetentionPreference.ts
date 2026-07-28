import { JOURNAL_RETENTION_DEFAULT_DAYS } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { db } from '@/db/db';

/**
 * How long this device keeps journalled operations, in days. User-configurable
 * by decision of the repository owner; thirty days is the default.
 *
 * Stored in the generic `meta` table like the profile: a missing or malformed
 * row reads as the default (`?? default`, no destructive migration), so the
 * preference is back-compatible by construction.
 */

const KEY = 'journalRetentionDays';

/**
 * The windows the settings surface offers. A bounded set rather than a free
 * number: every option is a value {@link setJournalRetentionDays} accepts, so
 * the control cannot express an invalid preference.
 */
export const RETENTION_OPTIONS: readonly number[] = [7, 30, 90, 365];

/** Bounds a stored or offered value to something the policy accepts. */
const isValidDays = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365;

/**
 * The preference held by one database. Parameterised because catch-up reads it
 * for whichever database it was given, and a helper bound to the application
 * singleton would answer for a different device's journal than the one being
 * served.
 */
export const getJournalRetentionDaysFor = async (database: LoremDB): Promise<number> => {
  const row = await database.meta.get(KEY);
  return isValidDays(row?.value) ? row.value : JOURNAL_RETENTION_DEFAULT_DAYS;
};

export const getJournalRetentionDays = (): Promise<number> =>
  getJournalRetentionDaysFor(db);

export const setJournalRetentionDays = async (days: number): Promise<void> => {
  if (!isValidDays(days)) {
    throw new RangeError('journal retention: days must be a whole number from 1 to 365');
  }
  await db.meta.put({ key: KEY, value: days });
};
