import { fileURLToPath } from 'node:url';

/**
 * Allow-list validator for the Writer preview/production origins the Vercel
 * protection-bypass secret may be sent to. It is deliberately strict: a broad
 * `*.vercel.app` match would let the secret leak to any Vercel deployment, so
 * only the configured Writer production hosts and the exact Writer Vercel
 * **project + owner** preview pattern are accepted. Never allow arbitrary hosts,
 * and never log the input or any secret.
 *
 * The identity is configured from the environment (defaulting to the known
 * values) so the same validator serves any deployment:
 *   - `WRITER_VERCEL_OWNER`        (default `shavindra`)
 *   - `WRITER_VERCEL_PROJECT`      (default `lipsumwriter`)
 *   - `WRITER_PRODUCTION_HOSTS`    (comma list; default the two production hosts)
 */

const DEFAULTS = {
  owner: 'shavindra',
  project: 'lipsumwriter',
  productionHosts: 'lipsumwriter.vercel.app,lipsumwriter.com',
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build the current allow-list from the environment (or defaults). */
const allowList = (env = process.env) => {
  const owner = env.WRITER_VERCEL_OWNER || DEFAULTS.owner;
  const project = env.WRITER_VERCEL_PROJECT || DEFAULTS.project;
  const productionHosts = new Set(
    (env.WRITER_PRODUCTION_HOSTS || DEFAULTS.productionHosts)
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean),
  );
  // `<project>-<anything>-<owner>.vercel.app` — covers both the `-git-<branch>-`
  // alias and the `-<deployment-hash>-` form, bounded to this project and owner.
  const previewHost = new RegExp(
    `^${escapeRegExp(project)}-[a-z0-9._-]+-${escapeRegExp(owner)}\\.vercel\\.app$`,
  );
  return { productionHosts, previewHost };
};

/**
 * Validate a candidate origin and return its canonical `url.origin`, or throw.
 * @param {string} input
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export const validateWriterPreviewOrigin = (input, env = process.env) => {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('preview origin is missing');
  }
  if (/\s/.test(input)) {
    throw new Error('preview origin must not contain whitespace');
  }
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('preview origin is not a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('preview origin must use https');
  }
  if (url.username || url.password) {
    throw new Error('preview origin must not carry credentials');
  }
  if (url.port) {
    throw new Error('preview origin must not specify a port');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('preview origin must have no path');
  }
  if (url.search) {
    throw new Error('preview origin must have no query');
  }
  if (url.hash) {
    throw new Error('preview origin must have no fragment');
  }
  const { productionHosts, previewHost } = allowList(env);
  if (!productionHosts.has(url.hostname) && !previewHost.test(url.hostname)) {
    throw new Error('preview origin is not an allowed Writer origin');
  }
  return url.origin;
};

// CLI: `node scripts/preview-origin.mjs <url>` prints the validated origin, or
// exits non-zero with the reason on stderr (never the secret).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.stdout.write(`${validateWriterPreviewOrigin(process.argv[2])}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
