import type { DependencyList } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDeviceKeyRevision } from './useDeviceKeyRevision';

/**
 * `useLiveQuery` for reads of encrypted, row-sealed cloud tables (spaces,
 * sections, docs, notes, …). Dexie only re-runs a live query when a table it
 * read emits a change; acquiring the device key changes no content row, so a
 * keyless device's hidden rows would stay hidden until reload. Folding the
 * device-key revision into the dependency array forces the query to re-evaluate
 * the instant the key is acquired, reloaded (cross-tab), or forgotten — the
 * query itself never needs to read the number.
 *
 * Local-only tables (settings, backups, syncs, docUpdates, …) must keep using the
 * plain `useLiveQuery`: they are never sealed, so re-running them on key changes
 * would be pure churn.
 */
export function useEncryptedLiveQuery<T>(
  query: () => Promise<T> | T,
  deps?: DependencyList,
): T | undefined;
export function useEncryptedLiveQuery<T, TDefault>(
  query: () => Promise<T> | T,
  deps: DependencyList,
  defaultResult: TDefault,
): T | TDefault;
export function useEncryptedLiveQuery<T, TDefault>(
  query: () => Promise<T> | T,
  deps: DependencyList = [],
  defaultResult?: TDefault,
): T | TDefault | undefined {
  const revision = useDeviceKeyRevision();
  return useLiveQuery(query, [...deps, revision], defaultResult as TDefault);
}

interface Keyed<T> {
  key: string;
  value: T;
}

/**
 * A keyed encrypted live query: reruns on key-revision changes *and* guards
 * against a stale result from a previous key argument. While a query for a new
 * key is in flight the last key's value is suppressed (returns `undefined`)
 * rather than flashed, so a section/doc list never shows the wrong space's rows.
 */
export const useKeyedEncryptedLiveQuery = <T>(
  key: string | null | undefined,
  query: (key: string) => Promise<T>,
  emptyForNoKey: T,
): T | undefined => {
  const revision = useDeviceKeyRevision();
  const keyed = useLiveQuery<Keyed<T>>(async () => {
    if (!key) return { key: '', value: emptyForNoKey };
    return { key, value: await query(key) };
  }, [key, revision]);
  if (keyed === undefined) return undefined;
  if (!key) return keyed.value;
  return keyed.key === key ? keyed.value : undefined;
};
