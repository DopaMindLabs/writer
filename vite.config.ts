import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Writer/' : '/',
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
  },
}));
