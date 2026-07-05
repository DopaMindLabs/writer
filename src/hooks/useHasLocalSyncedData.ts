import { useLiveQuery } from 'dexie-react-hooks';
import { hasLocalSyncedData } from '@/lib/cloud/escrowReconcile';

/** Reactively whether any synced table holds content on this device. */
export const useHasLocalSyncedData = (): boolean =>
  useLiveQuery(() => hasLocalSyncedData(), [], false);
