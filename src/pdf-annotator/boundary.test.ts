import { describe, it, expect } from 'vitest';

/**
 * The tripwire that keeps this module extractable after the runbook is
 * forgotten. Every file under `src/pdf-annotator/` must depend only on `react`,
 * `class-variance-authority`, `clsx` and its own relative modules — never the
 * app (`@/`), the engine (`react-pdf`/`pdfjs`), i18n (`react-i18next`) or the db
 * (`dexie`). Tests and stories obey the boundary too; the only allowance is
 * `@storybook/*` inside `*.stories.tsx`.
 */
const sources = import.meta.glob('./**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const BANNED = /from '(@\/|react-pdf|pdfjs|react-i18next|dexie)/;

describe('pdf-annotator module boundary', () => {
  it('imports nothing from the app, the engine, i18n or the db', () => {
    const offenders: string[] = [];
    // Guard against a vacuous pass if the glob ever stops matching files.
    expect(Object.keys(sources).length).toBeGreaterThan(5);
    for (const [path, source] of Object.entries(sources)) {
      if (path.endsWith('boundary.test.ts')) continue;
      source.split('\n').forEach((line, index) => {
        if (BANNED.test(line)) offenders.push(`${path}:${(index + 1).toString()}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
