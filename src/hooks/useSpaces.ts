import { db } from '@/db/db';
import { useEncryptedLiveQuery } from './useEncryptedLiveQuery';

export const useSpaces = () => {
  return useEncryptedLiveQuery(
    () => db.spaces.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  );
};

export const useSpace = (id: string | null | undefined) => {
  return useEncryptedLiveQuery(
    () => (id ? db.spaces.get(id) : undefined),
    [id],
    undefined,
  );
};
