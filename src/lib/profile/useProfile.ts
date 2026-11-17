import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { getProfile, parseProfile, type Profile } from './profile';

/**
 * Live-queries the local profile. The query is read-only (writing in a
 * liveQuery context throws), so the default is created — and any invalid stored
 * value repaired — by {@link getProfile} in an effect, off the read path.
 * Returns `undefined` only on the initial render before the row exists.
 */
export const useProfile = (): Profile | undefined => {
  const row = useLiveQuery(() => db.meta.get('profile'), []);

  useEffect(() => {
    void getProfile();
  }, []);

  return row ? parseProfile(row.value).profile : undefined;
};
