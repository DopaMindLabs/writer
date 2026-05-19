import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-ink-2',
        secondary: 'border border-rule bg-paper text-ink hover:bg-paper-2',
        ghost: 'text-ink hover:bg-paper-2',
        link: 'text-ink underline-offset-4 hover:underline',
        destructive: 'border border-danger text-danger hover:bg-danger-bg',
        default: 'bg-ink text-paper hover:bg-ink-2',
        outline: 'border border-rule bg-paper text-ink hover:bg-paper-2',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
