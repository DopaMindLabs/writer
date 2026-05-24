import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from '@/components/libs/icons';
import { cva, type VariantProps } from '@/components/libs/variants';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export const selectRecipe = cva(
  'block w-full appearance-none border-0 bg-transparent pl-0 pr-6 py-1.5 font-sans text-[14px] leading-tight text-ink outline-none disabled:cursor-not-allowed',
  {
    variants: {
      tone: {
        rest: '',
        error: '',
        disabled: 'text-ink-4',
      },
    },
    defaultVariants: { tone: 'rest' },
  },
);

type SelectVariants = VariantProps<typeof selectRecipe>;

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    Omit<SelectVariants, 'tone'> {
  options: ReadonlyArray<SelectOption>;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, disabled, error, ...rest }, ref) => {
    const tone = disabled ? 'disabled' : error ? 'error' : 'rest';
    const wrapperBorder = error
      ? 'border-ink'
      : 'border-rule focus-within:border-ink';
    const wrapperBg = disabled ? 'bg-paper-2' : '';

    return (
      <div
        className={cn(
          'group relative flex w-full items-center border-b transition-colors',
          wrapperBorder,
          wrapperBg,
          className,
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={error || undefined}
          className={selectRecipe({ tone })}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-0 h-3.5 w-3.5',
            disabled ? 'text-ink-4' : 'text-ink-3',
          )}
          aria-hidden
        />
      </div>
    );
  },
);
Select.displayName = 'Select';
