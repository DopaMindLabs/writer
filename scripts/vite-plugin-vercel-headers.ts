import { readFileSync } from 'node:fs';
import type { Connect, Plugin, PreviewServer } from 'vite';

interface VercelConfig {
  readonly headers: readonly {
    readonly headers: readonly { readonly key: string; readonly value: string }[];
  }[];
}

/**
 * Applies vercel.json's response headers to `vite preview` so the e2e suite runs
 * under the same Content-Security-Policy as production. Preview only — the dev
 * server needs Vite's inline module preamble, which the production CSP forbids.
 * The `configurePreviewServer` hook never runs for `dev` or `build`, so the
 * plugin is a no-op outside preview and can be registered unconditionally.
 */
export const vercelHeaders = (): Plugin => ({
  name: 'vercel-headers',
  configurePreviewServer: (server: PreviewServer) => {
    const { headers } = JSON.parse(
      readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
    ) as VercelConfig;
    const handle: Connect.NextHandleFunction = (_req, res, next) => {
      for (const rule of headers) {
        for (const entry of rule.headers) res.setHeader(entry.key, entry.value);
      }
      next();
    };
    server.middlewares.use(handle);
  },
});
