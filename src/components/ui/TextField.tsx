import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const textFieldRecipe = cva(
  'block w-full border-0 bg-transparent px-0 py-1.5 font-sans text-[14px] leading-tight text-ink outline-none transition-colors placeholder:text-ink-4 disabled:cursor-not-allowed',
  {
    variants: {
      tone: {
        rest: 'border-b border-rule focus:border-ink',
        error: 'border-b border-ink',
        disabled: 'border-b border-rule bg-paper-2 text-ink-4',
      },
    },
    defaultVariants: { tone: 'rest' },
  },
);

type TextFieldVariants = VariantProps<typeof textFieldRecipe>;

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    Omit<TextFieldVariants, 'tone'> {
  error?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, type = 'text', disabled, error, ...props }, ref) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(textFieldRecipe({ tone }), className)}
        {...props}
      />
    );
  },
);
TextField.displayName = 'TextField';
