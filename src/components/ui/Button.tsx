import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const buttonRecipe = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-sans font-medium tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      kind: {
        primary: 'bg-ink text-paper hover:bg-ink-2',
        secondary: 'border border-ink bg-transparent text-ink hover:bg-paper-2',
        ghost:
          'border-b border-ink bg-transparent px-0 text-ink hover:text-ink-2',
        dangerous: 'bg-ink text-paper hover:bg-ink-2',
      },
      size: {
        sm: 'h-7 px-3 text-xs',
        md: 'h-9 px-4 text-[13px]',
        lg: 'h-11 px-[22px] text-sm',
      },
    },
    compoundVariants: [
      { kind: 'ghost', size: 'sm', class: 'h-auto px-0 pb-[2px] text-xs' },
      { kind: 'ghost', size: 'md', class: 'h-auto px-0 pb-[2px] text-[13px]' },
      { kind: 'ghost', size: 'lg', class: 'h-auto px-0 pb-[2px] text-sm' },
    ],
    defaultVariants: { kind: 'primary', size: 'md' },
  },
);

export type ButtonKind = NonNullable<VariantProps<typeof buttonRecipe>['kind']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonRecipe>['size']>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonRecipe> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, kind, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
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
