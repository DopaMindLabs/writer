import { useLiveQuery } from 'dexie-react-hooks';
import { JOURNAL_RETENTION_DEFAULT_DAYS } from 'writer-sync/operations';
import { getJournalRetentionDays } from './journalRetentionPreference';

/**
 * The configured retention window, live: the row is observed, so two settings
 * surfaces showing the preference never disagree. Reads as the default until
 * the query resolves — the same value an unset preference stores.
 */
export const useJournalRetention = (): number =>
  useLiveQuery(() => getJournalRetentionDays(), []) ?? JOURNAL_RETENTION_DEFAULT_DAYS;
