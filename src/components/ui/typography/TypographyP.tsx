import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const typographyPVariants = cva('font-serif text-ink-2', {
  variants: {
    variant: {
      body: 'text-base leading-relaxed md:text-[18px]',
      lead: 'text-[17px] leading-relaxed',
      tagline: 'text-[18px] italic',
      description: 'text-base text-ink-3',
      caption: 'text-[13px] italic text-ink-3',
      empty: 'text-2xl text-ink',
      emptyHint: 'text-[20px] italic text-ink-3',
    },
  },
  defaultVariants: { variant: 'body' },
});

export interface TypographyPProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof typographyPVariants> {}

export const TypographyP = forwardRef<HTMLParagraphElement, TypographyPProps>(
  ({ className, variant, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(typographyPVariants({ variant }), className)}
      {...props}
    />
  ),
);
TypographyP.displayName = 'TypographyP';

export { typographyPVariants };
