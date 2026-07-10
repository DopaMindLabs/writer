import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const mediaBlock =
  /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ??
  '';

describe('reduced-motion CSS contract', () => {
  it('has a prefers-reduced-motion media rule', () => {
    expect(mediaBlock).not.toBe('');
  });

  it('excludes data-motion=full from the reduce media rule', () => {
    expect(mediaBlock).toContain(":not([data-motion='full'])");
  });

  it('still suppresses motion for the default/auto case in the media rule', () => {
    expect(mediaBlock).toContain('transition-duration: 0.01ms !important');
  });

  it('keeps an explicit data-motion=reduced override', () => {
    expect(css).toContain("[data-motion='reduced'] *");
  });

  it('does not use revert to restore motion (it would disable it instead)', () => {
    expect(css).not.toMatch(/:\s*revert\b/);
  });
});
