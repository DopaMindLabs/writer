import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '@/db/db';

// Some vitest+jsdom combinations don't expose window.localStorage. Install
// a Map-backed polyfill before any module imports it.
if (typeof window !== 'undefined') {
  const w = window as unknown as { localStorage?: Storage };
  if (!w.localStorage) {
    const store = new Map<string, string>();
    w.localStorage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
      key: (i) => Array.from(store.keys())[i] ?? null,
    } satisfies Storage;
  }
}

afterEach(() => {
  cleanup();
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
