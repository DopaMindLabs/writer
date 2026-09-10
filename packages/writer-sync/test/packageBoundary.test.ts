import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The extraction gates, enforced rather than documented. The package is only
 * reusable if it cannot reach back into the application that happens to host it
 * today — a single `@/` import would make the whole engine unusable elsewhere,
 * and would not be noticed until someone tried.
 */

// Resolved from the runner's root rather than `import.meta.url`: the suite runs
// in a jsdom environment where that is an http URL, not a file path. The
// file-count assertion below fails loudly if this ever points somewhere else.
const SRC = join(process.cwd(), 'packages/writer-sync/src');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });

const importsOf = (source: string): string[] =>
  [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]);

const files = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  source: readFileSync(path, 'utf8'),
}));

describe('the package boundary', () => {
  it('has source files to check', () => {
    // Guards the guard: a broken walk would make every assertion below vacuous.
    expect(files.length).toBeGreaterThan(10);
  });

  it('never imports through the application path alias', () => {
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) => specifier.startsWith('@/')),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('never imports from the host application by any path', () => {
    const offenders = files.filter(({ source }) =>
      importsOf(source).some(
        (specifier) => specifier.includes('/src/') || specifier.includes('writerSync'),
      ),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('never reaches for a runtime API the engine cannot assume', () => {
    // The engine runs in a browser tab as readily as in Node: a `node:` import
    // in engine source would quietly make it host-specific. (Test files, which
    // live outside `src`, may use them freely — this walk only sees source.)
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) => specifier.startsWith('node:')),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('keeps the framework and database dependencies out of the engine', () => {
    const forbidden = ['react', 'dexie', 'dexie-cloud-addon', 'yjs', 'lexical'];
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) =>
        forbidden.some(
          (name) => specifier === name || specifier.startsWith(`${name}/`),
        ),
      ),
    );
    expect(offenders.map((file) => file.path)).toEqual([]);
  });

  it('exposes each subpath through an explicit barrel, never a wildcard', () => {
    // Derived from the exports map so a new public subpath is guarded the day
    // it is added, instead of extending a hand-kept list that goes stale.
    const manifest: unknown = JSON.parse(
      readFileSync(join(SRC, '..', 'package.json'), 'utf8'),
    );
    const exportsMap =
      typeof manifest === 'object' && manifest !== null && 'exports' in manifest
        ? (manifest as { exports: Record<string, string> }).exports
        : {};
    const subpaths = Object.keys(exportsMap).map((key) => key.slice(2));
    expect(subpaths).toEqual(
      expect.arrayContaining(['core', 'crypto', 'operations', 'pairing', 'providers/webrtc']),
    );
    for (const subpath of subpaths) {
      const barrel = files.find((file) => file.path === join(subpath, 'index.ts'));
      expect(barrel, `${subpath} has no index.ts`).toBeDefined();
      expect(barrel?.source).not.toMatch(/export\s+\*/);
    }
  });
});
