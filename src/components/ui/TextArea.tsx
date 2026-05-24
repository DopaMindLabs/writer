import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export const textAreaRecipe = cva(
  'block w-full resize-y border bg-transparent px-3 py-2 font-serif text-[14px] leading-[1.55] text-ink outline-none transition-colors placeholder:text-ink-4 placeholder:font-serif placeholder:italic disabled:cursor-not-allowed',
  {
    variants: {
      tone: {
        rest: 'border-rule focus:border-ink',
        error: 'border-ink',
        disabled: 'border-rule bg-paper-2 text-ink-4',
      },
    },
    defaultVariants: { tone: 'rest' },
  },
);

type TextAreaVariants = VariantProps<typeof textAreaRecipe>;

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<TextAreaVariants, 'tone'> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, rows = 4, disabled, error, ...props }, ref) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(textAreaRecipe({ tone }), className)}
        {...props}
      />
    );
  },
);
TextArea.displayName = 'TextArea';
