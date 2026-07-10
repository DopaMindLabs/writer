import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const glyphRecipe = cva(
  'inline-flex items-center justify-center bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      on: {
        true: 'font-semibold text-ink',
        false: 'font-normal text-ink-3 hover:bg-paper-2 hover:text-ink',
      },
      italic: {
        true: 'font-serif italic',
        false: 'font-sans',
      },
    },
    defaultVariants: { on: false, italic: false },
  },
);

type GlyphVariants = VariantProps<typeof glyphRecipe>;

export interface GlyphProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    GlyphVariants {
  children: ReactNode;
  size?: number;
  label: string;
}

export const Glyph = forwardRef<HTMLButtonElement, GlyphProps>(
  (
    {
      children,
      size = 28,
      on,
      italic,
      label,
      title,
      className,
      type,
      style,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        aria-label={label}
        aria-pressed={typeof on === 'boolean' ? on : undefined}
        title={title}
        className={cn(glyphRecipe({ on, italic }), className)}
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.5),
          lineHeight: 1,
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
Glyph.displayName = 'Glyph';
