import { useEffect, useState } from 'react';
import {
  queryPersistence,
  type StoragePersistence,
} from '@/lib/pwa/persistentStorage';

/**
 * Report how durably the browser holds this origin's data, for the storage
 * protection row in settings. `unknown` while the async query settles.
 */
export const useStoragePersistence = (): StoragePersistence | 'unknown' => {
  const [persistence, setPersistence] = useState<StoragePersistence | 'unknown'>(
    'unknown',
  );

  useEffect(() => {
    let cancelled = false;
    void queryPersistence().then((value) => {
      if (!cancelled) setPersistence(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return persistence;
};
