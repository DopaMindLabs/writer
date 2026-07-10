/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_ROUTER?: string;
  readonly VITE_E2E?: string;
}
