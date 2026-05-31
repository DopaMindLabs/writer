import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  labelClassName?: string;
}

interface FormRowLabelProps {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  labelClassName?: string;
  labelTestId?: string;
  hintTestId?: string;
}

const FormRowLabel = ({
  label,
  hint,
  htmlFor,
  labelClassName,
  labelTestId,
  hintTestId,
}: FormRowLabelProps) => (
  <div className="flex flex-col gap-1">
    <label
      htmlFor={htmlFor}
      data-testid={labelTestId}
      className={cn(
        'font-sans text-[13px] font-medium leading-tight text-ink',
        labelClassName,
      )}
    >
      {label}
    </label>
    {hint ? (
      <div
        data-testid={hintTestId}
        className="font-serif text-[12px] italic leading-snug text-ink-3"
      >
        {hint}
      </div>
    ) : null}
  </div>
);

export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(
  (
    {
      label,
      hint,
      error,
      htmlFor,
      labelClassName,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const testId = (rest as { 'data-testid'?: string })['data-testid'];
    const labelTestId = testId ? `${testId}-label` : undefined;
    const hintTestId = testId ? `${testId}-hint` : undefined;
    const errorTestId = testId ? `${testId}-error` : undefined;

    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 items-start gap-1 border-b border-rule-s py-3 md:grid-cols-[200px_1fr] md:gap-6',
          className,
        )}
        {...rest}
      >
        <FormRowLabel
          label={label}
          hint={hint}
          htmlFor={htmlFor}
          labelClassName={labelClassName}
          labelTestId={labelTestId}
          hintTestId={hintTestId}
        />
        <div className="flex flex-col gap-1.5">
          <div>{children}</div>
          {error ? (
            <div
              data-testid={errorTestId}
              role="alert"
              className="font-mono text-[10px] uppercase tracking-wider text-ink"
            >
              <span aria-hidden>✕ </span>
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
FormRow.displayName = 'FormRow';
