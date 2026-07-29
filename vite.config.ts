/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };

/**
 * Installable PWA with a prompt-based update flow. The generated service
 * worker precaches the whole build — the data layer is already local-first in
 * IndexedDB, so precaching the shell is all offline needs. `registerType:
 * 'prompt'` means a new build is never activated behind the writer's back
 * (tabs share one origin; a silent swap would mix chunk versions mid-session);
 * the update banner applies it explicitly. No runtime caching rules: Dexie
 * Cloud fetch/websocket traffic passes straight through to the network.
 * `start_url`/`scope`/icon paths are relative so the one config serves both
 * deploy bases (`/writer/` on GitHub Pages, `/` on Vercel).
 */
const pwaPlugin = () =>
  VitePWA({
    registerType: 'prompt',
    includeAssets: [
      'favicon.svg',
      'icon.svg',
      'icon-maskable.svg',
      'icon-monochrome.svg',
      'apple-touch-icon.png',
    ],
    manifest: {
      id: './',
      name: 'LIpsum Writer',
      short_name: 'LIpsum',
      description:
        'A clutter-free space for long-form writing — fiction, research, essays, journals.',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#111111',
      icons: [
        {
          src: 'icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: 'pwa-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'pwa-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'icon-maskable.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
        {
          src: 'pwa-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: 'icon-monochrome.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'monochrome',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      navigateFallback: 'index.html',
      // The single app chunk (Lexical + Yjs + React) is ~5.5 MB — above
      // Workbox's 2 MiB default. Offline is the point of the precache, so the
      // shell chunk must be admitted; 8 MiB leaves headroom without silently
      // swallowing a future runaway bundle.
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    },
    devOptions: { enabled: false },
  });

/** Short commit SHA for the About build info: Vercel's env first, else git,
 *  else a stable fallback so a build in a shallow / no-git context still works. */
const resolveCommit = (): string => {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

export default defineConfig(({ command, mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(mode === 'test' ? '0.0.0-test' : appVersion),
    __APP_COMMIT__: JSON.stringify(mode === 'test' ? 'testcommit' : resolveCommit()),
    __APP_BUILD_TIME__: JSON.stringify(
      mode === 'test' ? '1970-01-01T00:00:00.000Z' : new Date().toISOString(),
    ),
  },
  base:
    command === 'build'
      ? process.env.VITE_BASE ?? '/writer/'
      : process.env.VITE_BASE ?? '/',
  plugins: [react(), pwaPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: process.env.VITE_E2E === '1',
  },
  preview: {
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // `virtual:pwa-register` exists only inside a vite-plugin-pwa build; unit
    // tests resolve it to a stub so the suite stays hermetic.
    alias: {
      'virtual:pwa-register': new URL(
        './src/test/pwaRegisterStub.ts',
        import.meta.url,
      ).pathname,
    },
    // Keep the suite hermetic: a developer's `.env.local` cloud-sync gates must
    // never leak into tests. Cases that need them stub the values explicitly.
    // The device-registry windows are shortened to seconds in a local .env.local
    // so the reclaim can be exercised by hand; the suite must still see the
    // shipped defaults.
    env: {
      VITE_DEXIE_CLOUD_URL: '',
      VITE_CLOUD_SYNC_FLAG: '',
      VITE_DEVICE_REFRESH_SECONDS: '',
      VITE_DEVICE_STALE_SECONDS: '',
    },
    reporter: process.env.CI ? 'verbose' : 'default',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    outputDiffLines: 50,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        'src/db/schema.ts',
        'src/data/templates/types.ts',
        'src/main.tsx',
        'src/editor/**',
        'src/tours/driver-setup.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/__snapshots__/**',
      ],
      thresholds: {
        lines: 98,
        statements: 97,
        functions: 96,
        branches: 91,
      },
    },
  },
}));
