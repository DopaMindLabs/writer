/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ROUTER?: string;
  readonly VITE_E2E?: string;
  /** Overrides the CRDT log compaction threshold; used by the e2e build so the
   *  merge path is reachable without hundreds of edits. Defaults to 200. */
  readonly VITE_COMPACT_THRESHOLD?: string;
  /** Dexie Cloud database URL. One of the two gates for the hidden cloud-sync
   *  beta; absent in ordinary builds, so the app stays local-only. */
  readonly VITE_DEXIE_CLOUD_URL?: string;
}
