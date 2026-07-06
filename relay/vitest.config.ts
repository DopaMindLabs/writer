import { defineConfig } from 'vitest/config';

// Relay tests run in a plain Node environment, independent of the app's jsdom
// setup — this config stops Vitest from climbing to the root app config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
