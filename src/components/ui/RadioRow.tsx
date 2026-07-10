import { forwardRef, useId, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioRowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  name: string;
  options: readonly RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface RadioRowOptionProps {
  option: RadioOption;
  id: string;
  name: string;
  active: boolean;
  disabled?: boolean;
  optionTestId?: string;
  onChange: (value: string) => void;
}

const RadioRowOption = ({
  option,
  id,
  name,
  active,
  disabled,
  optionTestId,
  onChange,
}: RadioRowOptionProps) => {
  return (
    <label
      htmlFor={id}
      data-testid={optionTestId ? `${optionTestId}-label` : undefined}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2',
        disabled && 'cursor-not-allowed',
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={option.value}
        checked={active}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.checked) onChange(option.value);
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
        {active && <span className="h-[6px] w-[6px] rounded-full bg-ink" />}
      </span>
      <span>{option.label}</span>
    </label>
  );
};

export const RadioRow = forwardRef<HTMLDivElement, RadioRowProps>(
  ({ name, options, value, onChange, disabled, className, ...rest }, ref) => {
    const groupId = useId();
    const testId = (rest as { 'data-testid'?: string })['data-testid'];

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-disabled={disabled ? true : undefined}
        className={cn(
          'inline-flex items-center gap-4 font-sans',
          disabled && 'opacity-50',
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <RadioRowOption
            key={opt.value}
            option={opt}
            id={`${groupId}-${opt.value}`}
            name={name}
            active={opt.value === value}
            disabled={disabled}
            optionTestId={testId ? `${testId}-${opt.value}` : undefined}
            onChange={onChange}
          />
        ))}
      </div>
    );
  },
);
RadioRow.displayName = 'RadioRow';
