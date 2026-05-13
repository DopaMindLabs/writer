import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        'ink-4': 'var(--ink-4)',
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        'hl-yellow': 'var(--hl-yellow)',
        'hl-pink': 'var(--hl-pink)',
        'hl-blue': 'var(--hl-blue)',
        'hl-green': 'var(--hl-green)',
        'hl-ash': 'var(--hl-ash)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
