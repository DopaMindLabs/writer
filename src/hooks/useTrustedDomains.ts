import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { TrustedDomain } from '@/db/schema';

export const useTrustedDomains = (): TrustedDomain[] => {
  return useLiveQuery(
    () => db.trustedDomains.orderBy('domain').toArray(),
    [],
    [],
  );
};
