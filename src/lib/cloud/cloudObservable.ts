import { useEffect, useState } from 'react';

/** A cancellable subscription — the minimal slice of an RxJS Subscription. */
export interface CloudSubscription {
  unsubscribe: () => void;
}

/**
 * The minimal observable interface the cloud UI depends on. An RxJS
 * `BehaviorSubject` (what `db.cloud` exposes) satisfies it structurally, so
 * components and stories can inject plain fakes without importing the addon.
 */
export interface CloudObservable<T> {
  subscribe: (next: (value: T) => void) => CloudSubscription;
}

/** Subscribe to a {@link CloudObservable} and re-render on each emission. */
export const useCloudObservable = <T,>(
  observable: CloudObservable<T>,
  initial: T,
): T => {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const subscription = observable.subscribe(setValue);
    return () => {
      subscription.unsubscribe();
    };
  }, [observable]);
  return value;
};
