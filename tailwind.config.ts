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
        'rule-s': 'var(--rule-s)',
        accent: 'var(--accent)',
        'hl-yellow': 'var(--hl-yellow)',
        'hl-pink': 'var(--hl-pink)',
        'hl-blue': 'var(--hl-blue)',
        'hl-green': 'var(--hl-green)',
        'hl-ash': 'var(--hl-ash)',
        'presence-1': 'var(--presence-1)',
        'presence-2': 'var(--presence-2)',
        'presence-3': 'var(--presence-3)',
        'presence-4': 'var(--presence-4)',
        'presence-5': 'var(--presence-5)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        info: 'var(--info)',
        'info-bg': 'var(--info-bg)',
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
