/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 'browser' on Vercel (SPA rewrites); unset on GitHub Pages (hash router). */
  readonly VITE_ROUTER?: string;
  /**
   * '1' only in the e2e build (`npm run build:e2e`). Gates test-only escape
   * hatches — the destructive `?reseed` boot parameter and source-map output —
   * out of real production builds.
   */
  readonly VITE_E2E?: string;
}
