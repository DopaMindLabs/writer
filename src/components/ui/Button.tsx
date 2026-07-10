import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';
import { buttonRecipe } from './Button.recipe';
import { SlotPrimitive } from './slot.primitives';

export type { ButtonKind, ButtonSize } from './Button.recipe';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonRecipe> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, kind, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonRecipe({ kind, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
