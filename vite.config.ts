/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };

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
  plugins: [react()],
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
    // Keep the suite hermetic: a developer's `.env.local` cloud-sync gates must
    // never leak into tests. Cases that need them stub the values explicitly.
    env: {
      VITE_DEXIE_CLOUD_URL: '',
      VITE_CLOUD_SYNC_FLAG: '',
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
