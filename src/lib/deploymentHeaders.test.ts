import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The deployed headers are a contract the app depends on but cannot read.
 *
 * `vercel.json` ships no code, so nothing else in the suite notices when a
 * directive is tightened — the failure appears only in production, on the
 * engines the local run never uses. These hold the two relaxations two features
 * cannot work without, and the tightening each must keep.
 */

interface DeploymentHeader {
  key: string;
  value: string;
}

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as { headers: { headers: DeploymentHeader[] }[] };

const headerValue = (key: string): string => {
  const found = config.headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === key);
  expect(found, `${key} is not sent`).toBeDefined();
  return found?.value ?? '';
};

const directive = (policy: string, name: string): string =>
  policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? '';

describe('deployed security headers', () => {
  it('lets the QR scanner compile its decoder', () => {
    // Without this the WASM ponyfill throws a CompileError under CSP3 wherever
    // the browser has no BarcodeDetector — Firefox and Safari, iOS included —
    // so scanning is dead in production and typed codes are the only way to
    // pair.
    expect(directive(headerValue('Content-Security-Policy'), 'script-src')).toContain(
      "'wasm-unsafe-eval'",
    );
  });

  it('permits WebAssembly without permitting eval', () => {
    // 'wasm-unsafe-eval' is the narrow grant; 'unsafe-eval' would hand back
    // string-to-code evaluation for the whole page.
    expect(directive(headerValue('Content-Security-Policy'), 'script-src')).not.toContain(
      "'unsafe-eval'",
    );
  });

  it('lets the pairing dialog reach the camera', () => {
    expect(headerValue('Permissions-Policy')).toContain('camera=(self)');
  });
});
