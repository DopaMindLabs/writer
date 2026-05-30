import { forwardRef, useId, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  name: string;
  options: ReadonlyArray<RadioOption>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const RadioRow = forwardRef<HTMLDivElement, RadioRowProps>(
  (
    { name, options, value, onChange, disabled, className, ...rest },
    ref,
  ) => {
    const groupId = useId();
    const testId = (rest as { 'data-testid'?: string })['data-testid'];

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-disabled={disabled || undefined}
        className={cn(
          'inline-flex items-center gap-4 font-sans',
          disabled && 'opacity-50',
          className,
        )}
        {...rest}
      >
        {options.map((opt) => {
          const id = `${groupId}-${opt.value}`;
          const active = opt.value === value;
          const optionTestId = testId ? `${testId}-${opt.value}` : undefined;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              data-testid={
                optionTestId ? `${optionTestId}-label` : undefined
              }
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2',
                disabled && 'cursor-not-allowed',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={active}
                disabled={disabled}
                onChange={(e) => {
                  if (e.target.checked) onChange(opt.value);
                }}
                data-testid={optionTestId}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'relative inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border transition-colors',
                  active ? 'border-ink' : 'border-rule',
                  'peer-focus-visible:ring-1 peer-focus-visible:ring-ink',
                )}
              >
                {active && (
                  <span className="h-[6px] w-[6px] rounded-full bg-ink" />
                )}
              </span>
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  },
);
RadioRow.displayName = 'RadioRow';
