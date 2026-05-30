import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const textAreaRecipe = cva(
  'block w-full bg-transparent font-serif text-[14px] leading-[1.55] text-ink outline-none transition-colors placeholder:text-ink-4 placeholder:font-serif placeholder:italic disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        framed: 'resize-y border px-3 py-2',
        bare: 'border-0 p-0',
      },
      tone: {
        rest: '',
        error: '',
        disabled: 'bg-paper-2 text-ink-4',
      },
    },
    compoundVariants: [
      { variant: 'framed', tone: 'rest', class: 'border-rule focus:border-ink' },
      { variant: 'framed', tone: 'error', class: 'border-ink' },
      { variant: 'framed', tone: 'disabled', class: 'border-rule' },
    ],
    defaultVariants: { variant: 'framed', tone: 'rest' },
  },
);

type TextAreaVariants = VariantProps<typeof textAreaRecipe>;

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<TextAreaVariants, 'tone'> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    { className, rows = 4, variant, disabled, error, ...props },
    ref,
  ) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(textAreaRecipe({ variant, tone }), className)}
        {...props}
      />
    );
  },
);
TextArea.displayName = 'TextArea';
