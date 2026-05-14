import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import '@/i18n';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';

const initialUIState = useUI.getState();

// Some vitest+jsdom combinations don't expose window.localStorage. Install
// a Map-backed polyfill before any module imports it.
// jsdom doesn't implement HTMLElement.setPointerCapture / hasPointerCapture
// / releasePointerCapture. SplitScreen's divider uses these for drag.
if (typeof Element !== 'undefined') {
  type WithPointerCapture = Element & {
    setPointerCapture: (id: number) => void;
    hasPointerCapture: (id: number) => boolean;
    releasePointerCapture: (id: number) => void;
  };
  const proto = Element.prototype as Partial<WithPointerCapture>;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
}

// jsdom < 24 doesn't implement File.prototype.text. parseBibtexFile in
// src/lib/bibtex.ts calls file.text() to read the .bib contents, so we
// polyfill it here using FileReader.readAsText.
if (typeof File !== 'undefined' && !('text' in File.prototype)) {
  (
    File.prototype as unknown as { text: () => Promise<string> }
  ).text = function (this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

if (typeof window !== 'undefined') {
  // jsdom doesn't implement matchMedia. Install a default stub so code paths
  // that read it (and tests that vi.spyOn it) have a function to operate on.
  const w = window as unknown as {
    localStorage?: Storage;
    matchMedia?: (q: string) => MediaQueryList;
  };
  if (!w.matchMedia) {
    w.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }

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
  useUI.setState(initialUIState, true);
  window.localStorage.clear();
});
