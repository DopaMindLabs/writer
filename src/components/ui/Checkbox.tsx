import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Check } from '@/components/libs/icons';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  labelClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      labelClassName,
      label,
      id,
      checked,
      defaultChecked,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? (label !== undefined ? autoId : undefined);
    const testId = (rest as { 'data-testid'?: string })['data-testid'];
    const boxTestId = testId ? `${testId}-box` : undefined;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 font-sans',
          disabled && 'opacity-50',
          className,
        )}
      >
        <span className="relative inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            className="peer h-[14px] w-[14px] cursor-pointer appearance-none border border-rule bg-paper transition-colors checked:border-ink checked:bg-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:cursor-not-allowed"
            {...rest}
          />
          <Check
            data-testid={boxTestId}
            className="pointer-events-none absolute h-[10px] w-[10px] text-paper opacity-0 peer-checked:opacity-100"
            aria-hidden
          />
        </span>
        {label !== undefined ? (
          <label
            htmlFor={inputId}
            className={cn(
              'cursor-pointer text-[13px] text-ink-2',
              disabled && 'cursor-not-allowed',
              labelClassName,
            )}
          >
            {label}
          </label>
        ) : null}
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';
