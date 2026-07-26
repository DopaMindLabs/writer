import { invariant } from '@/lib/invariant';

interface KeylessLockService {
  current: () => boolean;
  set: (value: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  beginBarrier: (allowOwnerWrites?: boolean) => boolean;
  releaseBarrier: () => void;
}

interface WriteBarrierLease {
  version: 1;
  source: string;
  expiresAt: number;
  allowOwnerWrites: boolean;
}

interface WriteBarrierService {
  current: () => boolean;
  begin: (allowOwnerWrites?: boolean) => boolean;
  release: () => void;
}

type StoredLease = WriteBarrierLease | 'invalid' | null;

const WRITE_BARRIER_KEY = 'lipsum-cloud-write-barrier';
const BARRIER_TTL_MS = 120_000;
const BARRIER_RENEW_MS = 30_000;

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const parseLease = (raw: string): WriteBarrierLease => {
  const value: unknown = JSON.parse(raw);
  invariant(typeof value === 'object' && value !== null, 'invalid cloud write barrier');
  const lease = value as Partial<WriteBarrierLease>;
  invariant(lease.version === 1, 'invalid cloud write barrier version');
  invariant(typeof lease.source === 'string', 'invalid cloud write barrier source');
  invariant(
    typeof lease.allowOwnerWrites === 'boolean',
    'invalid cloud write barrier owner policy',
  );
  invariant(
    typeof lease.expiresAt === 'number' && Number.isFinite(lease.expiresAt),
    'invalid cloud write barrier expiry',
  );
  return lease as WriteBarrierLease;
};

/** Read shared barrier state, failing closed when same-origin storage is malformed. */
const readLease = (store: Storage | null): StoredLease => {
  if (!store) return null;
  try {
    const raw = store.getItem(WRITE_BARRIER_KEY);
    if (raw === null) return null;
    return parseLease(raw);
  } catch {
    return 'invalid';
  }
};

const activeLease = (lease: StoredLease): StoredLease =>
  lease !== null && lease !== 'invalid' && lease.expiresAt <= Date.now()
    ? null
    : lease;

const leaseBlocksSource = (lease: StoredLease, source: string): boolean =>
  lease === 'invalid' ||
  (lease !== null && (lease.source !== source || !lease.allowOwnerWrites));

const makeSourceId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${WRITE_BARRIER_KEY}-${Date.now().toString(36)}`;

/** Own the renewable, non-secret cross-tab lease used during sign-in. */
const createWriteBarrierService = (notify: () => void): WriteBarrierService => {
  let renewal: ReturnType<typeof setInterval> | null = null;
  let ownerMayWrite = false;
  const source = makeSourceId();

  const writeOwnLease = (): boolean => {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(
        WRITE_BARRIER_KEY,
        JSON.stringify({
          version: 1,
          source,
          expiresAt: Date.now() + BARRIER_TTL_MS,
          allowOwnerWrites: ownerMayWrite,
        }),
      );
      const stored = readLease(store);
      return stored !== 'invalid' && stored?.source === source;
    } catch {
      return false;
    }
  };

  const stopRenewal = (): void => {
    if (renewal === null) return;
    clearInterval(renewal);
    renewal = null;
  };

  const beginBarrier = (allowOwnerWrites = false): boolean => {
    const store = storage();
    if (!store) return false;
    const existing = activeLease(readLease(store));
    if (existing === 'invalid') return false;
    if (existing !== null && existing.source !== source) return false;
    ownerMayWrite = allowOwnerWrites;
    if (!writeOwnLease()) return false;
    stopRenewal();
    renewal = setInterval(() => {
      if (!writeOwnLease()) stopRenewal();
    }, BARRIER_RENEW_MS);
    notify();
    return true;
  };

  const releaseBarrier = (): void => {
    stopRenewal();
    const store = storage();
    const existing = readLease(store);
    if (store && existing !== 'invalid' && existing?.source === source) {
      try {
        store.removeItem(WRITE_BARRIER_KEY);
      } catch {
        /* malformed or unavailable storage remains locked (fail closed) */
      }
    }
    notify();
  };

  return {
    current: () => leaseBlocksSource(activeLease(readLease(storage())), source),
    begin: beginBarrier, release: releaseBarrier,
  };
};

/** Own the local monitor flag and cross-tab barrier behind one stable service. */
const createKeylessLockService = (): KeylessLockService => {
  let keyless = false;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  const barrier = createWriteBarrierService(notify);
  const onStorage = (event: StorageEvent): void => {
    if (event.key === WRITE_BARRIER_KEY) notify();
  };

  return {
    current: () => keyless || barrier.current(),
    set: (value) => {
      if (value === keyless) return;
      keyless = value;
      notify();
    },
    subscribe: (listener) => {
      if (listeners.size === 0 && typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage);
        }
      };
    },
    beginBarrier: barrier.begin,
    releaseBarrier: barrier.release,
  };
};

/**
 * Synchronous write-lock state for keyless cloud transitions. The monitor flag
 * covers a settled signed-in/keyless session; the expiring localStorage lease
 * closes the cross-tab gap while an asynchronous sign-in is still pending. The
 * lease contains no key material or account data and fails closed if malformed.
 * The middleware polls this service without a React hook.
 */
export const keylessLockState = createKeylessLockService();
