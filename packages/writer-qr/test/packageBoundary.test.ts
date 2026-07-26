import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The facade's boundary, enforced rather than documented. `writer-qr` exists so
 * that the application depends on ports, not on the QR libraries behind them —
 * and so the sync engine never learns what a QR is. A single import in the
 * wrong direction would quietly undo both properties.
 */

// Resolved from the runner's root rather than `import.meta.url`: the suite runs
// in a jsdom environment where that is an http URL, not a file path.
const SRC = join(process.cwd(), 'packages/writer-qr/src');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });

const importsOf = (source: string): string[] =>
  [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]);

const dynamicImportsOf = (source: string): string[] =>
  [...source.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((match) => match[1]);

const allImportsOf = (source: string): string[] => [
  ...importsOf(source),
  ...dynamicImportsOf(source),
];

const files = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  source: readFileSync(path, 'utf8'),
}));

describe('the writer-qr package boundary', () => {
  it('has source files to check', () => {
    // Guards the guard: a broken walk would make every assertion below vacuous.
    expect(files.length).toBeGreaterThan(3);
  });

  it('never imports through the application path alias', () => {
    const offenders = files.filter(({ source }) =>
      allImportsOf(source).some((specifier) => specifier.startsWith('@/')),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('never reaches into the application source tree', () => {
    const offenders = files.filter(({ source }) =>
      allImportsOf(source).some((specifier) => specifier.includes('src/')),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('never imports the sync engine — the facade stays QR-only', () => {
    const offenders = files.filter(({ source }) =>
      allImportsOf(source).some((specifier) => specifier.startsWith('writer-sync')),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('never imports a UI framework or a persistence library', () => {
    const forbidden = ['react', 'react-dom', 'dexie', 'yjs', 'lexical'];
    const offenders = files.filter(({ source }) =>
      allImportsOf(source).some((specifier) =>
        forbidden.some((name) => specifier === name || specifier.startsWith(`${name}/`)),
      ),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('never imports a node builtin', () => {
    const offenders = files.filter(({ source }) =>
      allImportsOf(source).some((specifier) => specifier.startsWith('node:')),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('confines the QR libraries to their own port', () => {
    // `uqr` may appear only under encode/, `barcode-detector` only under scan/ —
    // the point of the split subpath exports is that the scanner (and its lazy
    // WASM polyfill) never rides along with a screen that only renders a code.
    const misplaced = files.filter(({ path, source }) => {
      const imports = allImportsOf(source);
      const usesUqr = imports.some((s) => s === 'uqr' || s.startsWith('uqr/'));
      const usesDetector = imports.some(
        (s) => s === 'barcode-detector' || s.startsWith('barcode-detector/'),
      );
      return (usesUqr && !path.startsWith('encode/')) || (usesDetector && !path.startsWith('scan/'));
    });
    expect(misplaced.map(({ path }) => path)).toEqual([]);
  });

  it('re-exports nothing with a wildcard', () => {
    const offenders = files.filter(({ source }) => /export\s+\*\s+from/.test(source));
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });
});
