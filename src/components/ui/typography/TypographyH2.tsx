import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const typographyH2Variants = cva('font-serif tracking-tight text-ink', {
  variants: {
    variant: {
      default: 'text-[18px] font-medium',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface TypographyH2Props
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof typographyH2Variants> {}

export const TypographyH2 = forwardRef<HTMLHeadingElement, TypographyH2Props>(
  ({ className, variant, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(typographyH2Variants({ variant }), className)}
      {...props}
    />
  ),
);
TypographyH2.displayName = 'TypographyH2';

export { typographyH2Variants };
