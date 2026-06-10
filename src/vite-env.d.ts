/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 'browser' on Vercel (SPA rewrites); unset on GitHub Pages (hash router). */
  readonly VITE_ROUTER?: string;
  /** '1' only in `npm run build:e2e`; gates `?reseed` and source maps. */
  readonly VITE_E2E?: string;
}
