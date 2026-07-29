/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
/** Short commit SHA the app was built from (`unknown` if git was unavailable). */
declare const __APP_COMMIT__: string;
/** ISO-8601 timestamp of the build. */
declare const __APP_BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_ROUTER?: string;
  readonly VITE_E2E?: string;
  /** Overrides the CRDT log compaction threshold; used by the e2e build so the
   *  merge path is reachable without hundreds of edits. Defaults to 200. */
  readonly VITE_COMPACT_THRESHOLD?: string;
  /** Dexie Cloud database URL. One of the two gates for the hidden cloud-sync
   *  beta; absent in ordinary builds, so the app stays local-only. */
  readonly VITE_DEXIE_CLOUD_URL?: string;
  /** Build-time opt-in mirroring the runtime `?cloud-sync=on` flag. Set to
   *  `'on'` in non-production environments to surface the beta without the URL
   *  param; absent in production builds. */
  readonly VITE_CLOUD_SYNC_FLAG?: string;
}
