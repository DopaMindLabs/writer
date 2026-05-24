import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const labelRecipe = cva('font-sans text-[13px] leading-tight', {
  variants: {
    tone: {
      ink: 'text-ink',
      ink2: 'text-ink-2',
      ink3: 'text-ink-3',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
    },
  },
  defaultVariants: { tone: 'ink', weight: 'medium' },
});

type LabelVariants = VariantProps<typeof labelRecipe>;

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement>,
    LabelVariants {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, tone, weight, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelRecipe({ tone, weight }), className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
