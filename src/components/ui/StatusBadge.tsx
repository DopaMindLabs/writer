import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { STATUS_ICON, type StatusKind } from './statusRole';

const statusBadgeRecipe = cva(
  'inline-flex items-center gap-1.5 border font-mono uppercase leading-none tracking-[0.08em]',
  {
    variants: {
      kind: {
        error: 'border-danger/30 bg-danger-bg text-danger',
        warning: 'border-warning/30 bg-warning-bg text-warning',
        success: 'border-success/30 bg-success-bg text-success',
        info: 'border-info/30 bg-info-bg text-info',
      },
      size: {
        sm: 'px-1.5 py-1 text-[10px]',
        md: 'px-2 py-1.5 text-[11px]',
      },
    },
    defaultVariants: { kind: 'info', size: 'sm' },
  },
);

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeRecipe> {
  kind?: StatusKind;
  glyph?: boolean;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ kind = 'info', size, glyph = true, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusBadgeRecipe({ kind, size }), className)}
      {...props}
    >
      {glyph ? <Icon icon={STATUS_ICON[kind]} size="xs" /> : null}
      <span>{children}</span>
    </span>
  ),
);
StatusBadge.displayName = 'StatusBadge';
