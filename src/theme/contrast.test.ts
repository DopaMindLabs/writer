import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

const relLuminance = (hex: string): number => {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a: string, b: string): number => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

const readBlock = (selector: string): Record<string, string> => {
  const escaped = selector.replace(/[[\]'=*-]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  const body = re.exec(css)?.[1];
  if (!body) throw new Error(`contrast.test: block "${selector}" not found`);
  const vars: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]+)/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
};

const STATUS_ROLES = ['warning', 'danger', 'success', 'info'] as const;

interface ThemeCase {
  selector: string;
  paper: string;
  min: number;
}

const THEMES: ThemeCase[] = [
  { selector: ':root', paper: '--paper', min: 3 },
  { selector: "[data-theme='dark']", paper: '--paper', min: 3 },
  { selector: "[data-theme='hc-light']", paper: '--paper', min: 7 },
  { selector: "[data-theme='hc-dark']", paper: '--paper', min: 7 },
];

const paperFor = (vars: Record<string, string>): string =>
  vars['--paper'] ?? readBlock(':root')['--paper'];

describe('status palette contrast policy', () => {
  for (const theme of THEMES) {
    const vars = readBlock(theme.selector);
    const paper = paperFor(vars);
    for (const role of STATUS_ROLES) {
      const fg = vars[`--${role}`];
      const tint = vars[`--${role}-bg`];

      it(`${theme.selector} ${role} text meets ${theme.min}:1 on paper`, () => {
        expect(contrast(fg, paper)).toBeGreaterThanOrEqual(theme.min);
      });

      if (tint) {
        it(`${theme.selector} ${role} text meets ${theme.min}:1 on its tint`, () => {
          expect(contrast(fg, tint)).toBeGreaterThanOrEqual(theme.min);
        });
      }
    }
  }
});
