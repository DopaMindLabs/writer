import { pdfjs } from './pdfAdapter';

/**
 * The pdfjs-dist version this app is built against. It must equal the version
 * react-pdf resolves at runtime — a mismatched pair silently fails to render in
 * production. `pdfWorker.test.ts` asserts the installed version matches this
 * constant, so a lone dependency bump fails the build.
 */
export const PINNED_PDFJS_VERSION = '5.4.296';

/**
 * Configures the pdfjs worker from a same-origin bundled asset, satisfying the
 * production CSP (`worker-src 'self'`). Idempotent and safe to call before any
 * document load. Vite rewrites the `new URL(..., import.meta.url)` reference to
 * the emitted worker asset at build time.
 */
export const ensurePdfWorker = (): void => {
  if (pdfjs.GlobalWorkerOptions.workerSrc) return;
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
};
