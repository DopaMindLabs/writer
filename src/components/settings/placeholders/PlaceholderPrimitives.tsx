import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const PlaceholderToggle = ({ on = false }: { on?: boolean }) => {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-block h-4 w-7 rounded-full border',
        on ? 'border-ink bg-ink' : 'border-rule bg-paper-2',
      )}
    >
      <span
        className={cn(
          'absolute top-[1px] h-3 w-3 rounded-full bg-paper transition-transform',
          on ? 'left-[1px] translate-x-3' : 'left-[1px] translate-x-0',
        )}
      />
    </span>
  );
};

interface PlaceholderChipsProps {
  options: ReactNode[];
  active?: number;
}

export const PlaceholderChips = ({ options, active = 0 }: PlaceholderChipsProps) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((label, i) => {
        const on = i === active;
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center justify-center border px-3.5 py-1.5 text-[12px] tracking-[0.01em]',
              on
                ? 'border-ink bg-ink font-medium text-paper'
                : 'border-rule bg-paper text-ink',
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
};

export const PlaceholderSlider = ({
  pct = 50,
  a = 'S',
  b = 'L',
  v,
}: {
  pct?: number;
  a?: string;
  b?: string;
  v?: string;
}) => {
  return (
    <div className="flex items-center gap-3">
      <span className="font-serif text-[12px] text-ink-3">{a}</span>
      <div className="relative h-[2px] w-[200px] bg-rule">
        <div
          className="absolute left-0 top-0 h-full bg-ink"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-[5px] h-3 w-3 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="font-serif text-[16px] text-ink">{b}</span>
      {v && (
        <span className="ml-1 font-mono text-[11px] text-ink-3">{v}</span>
      )}
    </div>
  );
};

export const PlaceholderInput = ({
  value,
  width = 220,
  mono = false,
}: {
  value: string;
  width?: number;
  mono?: boolean;
}) => {
  return (
    <span
      aria-hidden
      style={{ width }}
      className={cn(
        'inline-block border border-rule bg-paper px-2.5 py-1.5 text-[14px] text-ink',
        mono && 'font-mono text-[12px] uppercase tracking-wider',
      )}
    >
      {value}
    </span>
  );
};

export const PlaceholderAccentDots = () => {
  const colours = ['#111111', '#7a6a55', '#5a6f55', '#6a5a7a', '#7a5a5a'];
  return (
    <div className="flex items-center gap-2">
      {colours.map((c, i) => (
        <span
          key={c}
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-paper"
          style={{ background: c }}
          aria-hidden
        >
          {i === 0 ? '✓' : ''}
        </span>
      ))}
    </div>
  );
};

export const PlaceholderThemeCards = () => {
  const cards: [string, string, string, boolean][] = [
    ['Linen', '#fafaf6', 'default', true],
    ['Studio', '#f3f3f0', 'neutral', false],
    ['Midnight', '#111111', 'dark', false],
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(([name, bg, sub, on]) => {
        const isDark = bg === '#111111';
        return (
          <div
            key={name}
            className="relative border border-rule p-3.5"
            style={{ background: bg, color: isDark ? '#fff' : '#111' }}
          >
            <div className="mb-3 h-9">
              <div className="mb-1.5 h-[2px] w-[40%] bg-current opacity-50" />
              <div className="mb-1 h-[2px] w-[70%] bg-current opacity-25" />
              <div className="h-[2px] w-[60%] bg-current opacity-25" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[15px] font-medium tracking-tight">
                {name}
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">
                {sub}
              </span>
            </div>
            {on && (
              <span
                className="absolute right-2.5 top-2.5 px-1.5 font-mono text-[9px] tracking-wider"
                style={{
                  background: isDark ? '#fff' : '#111',
                  color: isDark ? '#111' : '#fff',
                }}
              >
                ON
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const PlaceholderSwatchRow = ({
  name,
  color,
  rename,
  tune,
}: {
  name: string;
  color: string;
  rename: string;
  tune: string;
}) => {
  return (
    <div className="flex items-center gap-3.5 border border-rule p-3">
      <div
        className="h-7 w-7 border border-rule"
        style={{ background: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[14px] font-medium text-ink">{name}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {color.toUpperCase()}
        </div>
      </div>
      <span className="font-sans text-[11px] text-ink-3">{rename}</span>
      <span className="font-sans text-[11px] text-ink-3">{tune}</span>
    </div>
  );
};
