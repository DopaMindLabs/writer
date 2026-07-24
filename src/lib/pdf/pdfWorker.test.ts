import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

// The worker facade must never pull real pdfjs into the unit environment — it
// references DOMMatrix and other browser globals at import time. Mock the adapter
// seam (the one place react-pdf is imported) with a minimal pdfjs stub. Real
// pdfjs is exercised only in the Stage C e2e specs.
vi.mock('./pdfAdapter', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

import { pdfjs } from './pdfAdapter';
import { ensurePdfWorker, PINNED_PDFJS_VERSION } from './pdfWorker';

beforeEach(() => {
  pdfjs.GlobalWorkerOptions.workerSrc = '';
});

describe('pdfWorker', () => {
  it('pinned version matches the runtime pdfjs version', () => {
    // Read the installed pdfjs-dist version directly rather than pdfjs.version,
    // which is unreadable in jsdom. PA.1 asserts a single lockfile entry, so this
    // is the version react-pdf resolves; a lone Dependabot bump fails here.
    const req = createRequire(import.meta.url);
    const pkg = req('pdfjs-dist/package.json') as { version: string };
    expect(pkg.version).toBe(PINNED_PDFJS_VERSION);
  });

  it('ensurePdfWorker sets a same-origin module worker url once', () => {
    ensurePdfWorker();
    const first = pdfjs.GlobalWorkerOptions.workerSrc;
    expect(first).toMatch(/pdf\.worker\.min\.mjs$/);
    ensurePdfWorker();
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe(first);
  });
});
