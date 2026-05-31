import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // Register the "@/" alias for the whole Storybook build. vite-tsconfig-paths
  // only aliases files inside the tsconfig `include` (src), so .storybook files
  // (e.g. preview.tsx) need this to import via the alias like the rest of the app.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
      },
    }),
};

export default config;
