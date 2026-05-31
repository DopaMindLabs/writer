import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const typographyH1Variants = cva('font-serif tracking-tight text-ink', {
  variants: {
    variant: {
      display: 'text-4xl leading-[1.05] md:text-6xl',
      page: 'text-3xl leading-[1.05] md:text-5xl',
      section: 'text-[32px] font-normal leading-tight',
      compact: 'text-[22px] font-medium',
      simple: 'text-3xl',
    },
  },
  defaultVariants: { variant: 'display' },
});

export interface TypographyH1Props
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof typographyH1Variants> {}

export const TypographyH1 = forwardRef<HTMLHeadingElement, TypographyH1Props>(
  ({ className, variant, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(typographyH1Variants({ variant }), className)}
      {...props}
    />
  ),
);
TypographyH1.displayName = 'TypographyH1';

export { typographyH1Variants };
