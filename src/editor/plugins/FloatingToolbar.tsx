import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { BlockType } from '../formatting';

export interface FloatingToolbarProps {
  block: BlockType;
  bold: boolean;
  italic: boolean;
  onHeading: (level: 'h1' | 'h2' | 'h3' | 'h4') => void;
  onList: (kind: 'bullet' | 'number') => void;
  onQuote: () => void;
  onBold: () => void;
  onItalic: () => void;
  style: React.CSSProperties;
}

interface BtnProps {
  active?: boolean;
  label: string;
  ariaLabel: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

const Btn = ({ active, label, ariaLabel, onMouseDown }: BtnProps) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active ? 'true' : 'false'}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown(e);
      }}
      className={cn(
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded-sm px-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 hover:bg-paper-2 hover:text-ink',
        active && 'bg-paper-2 text-ink',
      )}
    >
      {label}
    </button>
  );
};

const Sep = () => {
  return <span aria-hidden className="mx-0.5 h-4 w-px bg-rule" />;
};

export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  (
    { block, bold, italic, onHeading, onList, onQuote, onBold, onItalic, style },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role="toolbar"
        aria-label="Formatting"
        style={style}
        className="z-50 flex items-center gap-0.5 rounded-sm border border-rule bg-paper p-1 shadow-md"
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        <Btn
          label="H1"
          ariaLabel="Heading 1"
          active={block === 'h1'}
          onMouseDown={() => onHeading('h1')}
        />
        <Btn
          label="H2"
          ariaLabel="Heading 2"
          active={block === 'h2'}
          onMouseDown={() => onHeading('h2')}
        />
        <Btn
          label="H3"
          ariaLabel="Heading 3"
          active={block === 'h3'}
          onMouseDown={() => onHeading('h3')}
        />
        <Btn
          label="H4"
          ariaLabel="Heading 4"
          active={block === 'h4'}
          onMouseDown={() => onHeading('h4')}
        />
        <Sep />
        <Btn
          label="•"
          ariaLabel="Bullet list"
          active={block === 'bullet'}
          onMouseDown={() => onList('bullet')}
        />
        <Btn
          label="1."
          ariaLabel="Numbered list"
          active={block === 'number'}
          onMouseDown={() => onList('number')}
        />
        <Btn
          label="“"
          ariaLabel="Blockquote"
          active={block === 'quote'}
          onMouseDown={onQuote}
        />
        <Sep />
        <Btn
          label="B"
          ariaLabel="Bold"
          active={bold}
          onMouseDown={onBold}
        />
        <Btn
          label="I"
          ariaLabel="Italic"
          active={italic}
          onMouseDown={onItalic}
        />
      </div>
    );
  },
);
FloatingToolbar.displayName = 'FloatingToolbar';
