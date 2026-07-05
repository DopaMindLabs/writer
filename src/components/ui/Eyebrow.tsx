import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { eyebrowRecipe, type EyebrowVariantProps } from './Eyebrow.recipe';
import { SlotPrimitive } from './slot.primitives';

export interface EyebrowProps
  extends HTMLAttributes<HTMLDivElement>,
    EyebrowVariantProps {
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
