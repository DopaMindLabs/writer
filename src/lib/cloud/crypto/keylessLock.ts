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
type StoredLeases = WriteBarrierLease[] | 'invalid';

const WRITE_BARRIER_PREFIX = 'lipsum-cloud-write-barrier:';
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

/** Read one shared lease, failing closed when same-origin storage is malformed. */
const readLease = (store: Storage | null, key: string): StoredLease => {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (raw === null) return null;
    const lease = parseLease(raw);
    invariant(key === `${WRITE_BARRIER_PREFIX}${lease.source}`, 'invalid barrier owner');
    return lease;
  } catch {
    return 'invalid';
  }
};

/** Read every tab's active lease; one malformed entry locks writes fail-closed. */
const readActiveLeases = (store: Storage | null): StoredLeases => {
  if (!store) return [];
  try {
    const leases: WriteBarrierLease[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key?.startsWith(WRITE_BARRIER_PREFIX)) continue;
      const lease = readLease(store, key);
      if (lease === 'invalid') return 'invalid';
      if (lease !== null && lease.expiresAt > Date.now()) leases.push(lease);
    }
    return leases;
  } catch {
    return 'invalid';
  }
};

const leasesBlockSource = (leases: StoredLeases, source: string): boolean =>
  leases === 'invalid' ||
  leases.some((lease) => lease.source !== source || !lease.allowOwnerWrites);

const makeSourceId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const serialiseLease = (source: string, allowOwnerWrites: boolean): string =>
  JSON.stringify({
    version: 1,
    source,
    expiresAt: Date.now() + BARRIER_TTL_MS,
    allowOwnerWrites,
  });

/** Own the renewable, non-secret cross-tab lease used during sign-in. */
const createWriteBarrierService = (notify: () => void): WriteBarrierService => {
  let renewal: ReturnType<typeof setInterval> | null = null;
  let ownerMayWrite = false;
  const source = makeSourceId();
  const ownKey = `${WRITE_BARRIER_PREFIX}${source}`;

  const writeOwnLease = (): boolean => {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(ownKey, serialiseLease(source, ownerMayWrite));
      const stored = readLease(store, ownKey);
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
    const existing = readActiveLeases(store);
    if (existing === 'invalid') return false;
    if (existing.some((lease) => lease.source !== source)) return false;
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
    const existing = readLease(store, ownKey);
    if (store && existing !== 'invalid' && existing?.source === source) {
      try {
        store.removeItem(ownKey);
      } catch {
        /* malformed or unavailable storage remains locked (fail closed) */
      }
    }
    notify();
  };
  return {
    current: () => leasesBlockSource(readActiveLeases(storage()), source),
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
    if (event.key === null || event.key.startsWith(WRITE_BARRIER_PREFIX)) notify();
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
