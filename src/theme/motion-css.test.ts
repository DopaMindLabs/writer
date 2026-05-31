import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the reduced-motion CSS contract (index.css):
 *   - the `prefers-reduced-motion` media rule must exclude `data-motion='full'`,
 *     so a user who picks "Full" keeps the app's authored motion even when the
 *     OS requests reduced motion;
 *   - we must not "restore" motion with `revert`, which rolls authored durations
 *     back to the UA default (no motion) rather than to our values.
 */

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
    // Look only at declarations, not comments: no `<prop>: revert` anywhere.
    expect(css).not.toMatch(/:\s*revert\b/);
  });
});
