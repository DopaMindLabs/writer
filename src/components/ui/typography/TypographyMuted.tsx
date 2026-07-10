import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const typographyMutedVariants = cva('text-ink-3', {
  variants: {
    variant: {
      default: 'text-sm',
      xs: 'text-xs',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface TypographyMutedProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof typographyMutedVariants> {}

export const TypographyMuted = forwardRef<
  HTMLParagraphElement,
  TypographyMutedProps
>(({ className, variant, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(typographyMutedVariants({ variant }), className)}
    {...props}
  />
));
TypographyMuted.displayName = 'TypographyMuted';
