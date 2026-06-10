/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { readFileSync } from 'node:fs';

const { version: appVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };

export default defineConfig(({ command }) => ({
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  base:
    command === 'build'
      ? process.env.VITE_BASE ?? '/writer/'
      : process.env.VITE_BASE ?? '/',
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
  },
  // Source maps are emitted only for the e2e build (`npm run build:e2e`),
  // where monocart-reporter needs them to map v8 coverage ranges back to the
  // original .tsx files. Real production builds ship without them.
  build: {
    sourcemap: process.env.VITE_E2E === '1',
  },
  preview: {
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
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
        // Branches at 91 — reflects defensive branches (??-fallbacks, optional
        // field ternaries) that are unreachable with the project's real data
        // unless we mock it. Raise if we ever refactor those out.
        branches: 91,
      },
    },
  },
}));
