import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { STATUS_ICON, type StatusKind } from './statusRole';

const statusGlyphRecipe = cva('inline-flex items-center gap-1.5', {
  variants: {
    kind: {
      error: 'text-danger',
      warning: 'text-warning',
      success: 'text-success',
      info: 'text-info',
    },
    mono: {
      true: 'font-mono text-[11px] uppercase tracking-[0.08em]',
      false: 'font-sans text-[13px] font-medium',
    },
  },
  defaultVariants: { kind: 'info', mono: true },
});

export interface StatusGlyphProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusGlyphRecipe> {
  kind?: StatusKind;
}

/** Inline icon + label — the lightest §5 status expression, for status that
 * reads as text (toolbars, footers, an alert line). */
export const StatusGlyph = forwardRef<HTMLSpanElement, StatusGlyphProps>(
  ({ kind = 'info', mono, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusGlyphRecipe({ kind, mono }), className)}
      {...props}
    >
      <Icon icon={STATUS_ICON[kind]} size="xs" />
      <span>{children}</span>
    </span>
  ),
);
StatusGlyph.displayName = 'StatusGlyph';
