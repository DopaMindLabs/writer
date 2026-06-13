import './blob-polyfill';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import '@/i18n';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup } from '@testing-library/react';
import { db } from '@/db/db';
import { useUI } from '@/store/ui';

vi.mock('react-pdf', async () => {
  const { createElement, useEffect } = await import('react');
  const Document = ({
    children,
    onLoadSuccess,
    className,
    'aria-hidden': ariaHidden,
  }: {
    children?: ReactNode;
    onLoadSuccess?: (doc: { numPages: number }) => void;
    className?: string;
    'aria-hidden'?: boolean;
  }) => {
    useEffect(() => {
      onLoadSuccess?.({ numPages: 8 });
    }, [onLoadSuccess]);
    return createElement(
      'div',
      {
        'data-testid': 'mock-pdf-doc',
        className,
        'aria-hidden': ariaHidden ? true : undefined,
      },
      children,
    );
  };
  const Page = ({
    pageNumber,
    scale,
  }: {
    pageNumber: number;
    scale?: number;
  }) =>
    createElement('div', {
      'data-testid': 'mock-pdf-page',
      'data-page': String(pageNumber),
      'data-scale': String(scale ?? 1),
    });
  return {
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
    Document,
    Page,
  };
});

const initialUIState = useUI.getState();

const REACT_ID_TOKEN = /^(?:radix-)?_r_[a-z0-9]+_$/i;
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && REACT_ID_TOKEN.test(val),
  serialize: (val, config, indentation, depth, refs, printer) =>
    printer(
      (val as string).replace(/_r_[a-z0-9]+_/gi, '_r_*_'),
      config,
      indentation,
      depth,
      refs,
    ),
});

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

if (typeof File !== 'undefined' && !('text' in File.prototype)) {
  (
    File.prototype as unknown as { text: () => Promise<string> }
  ).text = function (this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { resolve(String(reader.result ?? '')); };
      reader.onerror = () => { reject(reader.error); };
      reader.readAsText(this);
    });
  };
}

if (typeof URL !== 'undefined') {
  const u = URL as unknown as {
    createObjectURL: (obj: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  let counter = 0;
  u.createObjectURL = () => `blob:mock/${String(++counter)}`;
  u.revokeObjectURL = () => {};
}

if (typeof window !== 'undefined') {
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
      });
  }

  if (!w.localStorage) {
    const store = new Map<string, string>();
    w.localStorage = {
      get length() {
        return store.size;
      },
      clear: () => { store.clear(); },
      getItem: (k) => (store.has(k) ? (store.get(k)!) : null),
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
