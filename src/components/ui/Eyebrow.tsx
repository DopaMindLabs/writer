import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { SlotPrimitive } from './slot.primitives';

const eyebrowRecipe = cva(
  'font-mono uppercase tracking-[0.11em] leading-none',
  {
    variants: {
      size: {
        9: 'text-[9px]',
        10: 'text-[10px]',
        11: 'text-[11px]',
      },
      tone: {
        ink2: 'text-ink-2',
        ink3: 'text-ink-3',
        ink4: 'text-ink-4',
        paper: 'text-paper',
      },
    },
    defaultVariants: { size: 10, tone: 'ink3' },
  },
);

export interface EyebrowProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof eyebrowRecipe> {
  asChild?: boolean;
}

export const Eyebrow = forwardRef<HTMLDivElement, EyebrowProps>(
  ({ className, size, tone, asChild = false, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive : 'div';
    return (
      <Comp
        ref={ref}
        className={cn(eyebrowRecipe({ size, tone }), className)}
        {...props}
      />
    );
  },
);
Eyebrow.displayName = 'Eyebrow';
