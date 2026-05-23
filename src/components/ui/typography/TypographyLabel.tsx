import { forwardRef, type HTMLAttributes } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const typographyLabelVariants = cva('font-mono uppercase text-ink-3', {
  variants: {
    variant: {
      default: 'text-[10px] tracking-[0.08em]',
      wide: 'text-[10px] tracking-wider',
      xs: 'text-xs tracking-wider',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface TypographyLabelProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyLabelVariants> {
  asChild?: boolean;
}

export const TypographyLabel = forwardRef<HTMLElement, TypographyLabelProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';
    return (
      <Comp
        ref={ref}
        className={cn(typographyLabelVariants({ variant }), className)}
        {...props}
      />
    );
  },
);
TypographyLabel.displayName = 'TypographyLabel';

export { typographyLabelVariants };
