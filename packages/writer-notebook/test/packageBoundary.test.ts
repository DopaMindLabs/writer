import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = statSync(join(process.cwd(), 'src/core/index.ts'), { throwIfNoEntry: false })
  ? process.cwd()
  : join(process.cwd(), 'packages/writer-notebook');
const SRC = join(packageRoot, 'src');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });

const importsOf = (source: string): string[] => [
  ...[...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]),
  ...[...source.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((match) => match[1]),
];

const files = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1),
  source: readFileSync(path, 'utf8'),
}));

describe('the writer-notebook package boundary', () => {
  it('has both explicit public subpath barrels', () => {
    for (const subpath of ['core', 'browser']) {
      const barrel = files.find(({ path }) => path === join(subpath, 'index.ts'));
      expect(barrel, `${subpath} has no index.ts`).toBeDefined();
      expect(barrel?.source).not.toMatch(/export\s+\*/);
    }
  });

  it('does not import the Writer application or sync engine', () => {
    const forbidden = ['@/', 'writer-sync', 'src/'];
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) => forbidden.some((part) => specifier.includes(part))),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('does not import UI, persistence, editor or collaboration frameworks', () => {
    const forbidden = ['react', 'react-dom', 'dexie', 'lexical', 'yjs'];
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) =>
        forbidden.some((name) => specifier === name || specifier.startsWith(`${name}/`)),
      ),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });

  it('does not import Node builtins at runtime', () => {
    const offenders = files.filter(({ source }) =>
      importsOf(source).some((specifier) => specifier.startsWith('node:')),
    );
    expect(offenders.map(({ path }) => path)).toEqual([]);
  });
});
