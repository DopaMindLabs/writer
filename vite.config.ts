/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command }) => ({
  base:
    command === 'build'
      ? process.env.VITE_BASE ?? '/writer/'
      : process.env.VITE_BASE ?? '/',
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
  },
  // Emit source maps in production so e2e coverage can map v8 ranges back to
  // original .tsx files (monocart-reporter).
  build: {
    sourcemap: true,
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
        'src/**/__snapshots__/**',
      ],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        // Branches at 90 — reflects defensive branches (??-fallbacks, optional
        // field ternaries) that are unreachable with the project's real data
        // unless we mock it. Raise if we ever refactor those out.
        branches: 90,
      },
    },
  },
}));
