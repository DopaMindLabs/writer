export const BW = {
  paper: 'var(--paper)',
  paper2: 'var(--paper-2)',
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',
  ink4: 'var(--ink-4)',
  rule: 'var(--rule)',
  accent: 'var(--accent)',
} as const;

export const HL_COLORS = {
  yellow: 'var(--hl-yellow)',
  pink: 'var(--hl-pink)',
  blue: 'var(--hl-blue)',
  green: 'var(--hl-green)',
  ash: 'var(--hl-ash)',
} as const;

export type HighlightColor = keyof typeof HL_COLORS;

export const SERIF = '"Source Serif 4", Georgia, serif';
export const SANS = 'Geist, system-ui, -apple-system, sans-serif';
export const MONO = '"Geist Mono", ui-monospace, monospace';
