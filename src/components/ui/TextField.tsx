import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const textFieldRecipe = cva(
  'block w-full bg-transparent font-sans text-[14px] leading-tight text-ink outline-none transition-colors placeholder:text-ink-4 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        baseline: 'border-0 border-b px-0 py-1.5',
        bare: 'border-0 p-0',
      },
      tone: {
        rest: '',
        error: '',
        disabled: 'bg-paper-2 text-ink-4',
      },
    },
    compoundVariants: [
      {
        variant: 'baseline',
        tone: 'rest',
        class: 'border-rule focus:border-ink',
      },
      { variant: 'baseline', tone: 'error', class: 'border-ink' },
      { variant: 'baseline', tone: 'disabled', class: 'border-rule' },
    ],
    defaultVariants: { variant: 'baseline', tone: 'rest' },
  },
);

type TextFieldVariants = VariantProps<typeof textFieldRecipe>;

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    Omit<TextFieldVariants, 'tone'> {
  error?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    { className, type = 'text', variant, disabled, error, ...props },
    ref,
  ) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(textFieldRecipe({ variant, tone }), className)}
        {...props}
      />
    );
  },
);
TextField.displayName = 'TextField';
