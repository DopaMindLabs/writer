import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from '@/components/libs/icons';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectVariant = 'baseline' | 'bare';

export const selectRecipe = cva(
  'block w-full appearance-none border-0 bg-transparent leading-tight text-ink outline-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        baseline: 'pl-0 pr-6 py-1.5 font-sans text-[14px]',
        bare: 'p-0',
      },
      tone: {
        rest: '',
        error: '',
        disabled: 'text-ink-4',
      },
    },
    defaultVariants: { variant: 'baseline', tone: 'rest' },
  },
);

type SelectRecipeVariants = VariantProps<typeof selectRecipe>;

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    Omit<SelectRecipeVariants, 'tone'> {
  options: readonly SelectOption[];
  error?: boolean;
  /** Hide the trailing chevron (only meaningful for variant="bare"). */
  hideChevron?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, options, variant = 'baseline', disabled, error, hideChevron, ...rest },
    ref,
  ) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    const isBaseline = variant === 'baseline';
    const wrapperBorder = isBaseline
      ? error
        ? 'border-b border-ink'
        : 'border-b border-rule focus-within:border-ink'
      : '';
    const wrapperBg = disabled && isBaseline ? 'bg-paper-2' : '';
    const showChevron = !hideChevron && isBaseline;

    return (
      <div
        className={cn(
          'group relative flex w-full items-center transition-colors',
          wrapperBorder,
          wrapperBg,
          className,
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={selectRecipe({ variant, tone })}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {showChevron ? (
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-0 h-3.5 w-3.5',
              disabled ? 'text-ink-4' : 'text-ink-3',
            )}
            aria-hidden
          />
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
