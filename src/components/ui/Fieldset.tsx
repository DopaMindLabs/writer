import { forwardRef, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FieldsetProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'children'> {
  label: ReactNode;
  children: ReactNode;
  labelClassName?: string;
}

export const Fieldset = forwardRef<HTMLFieldSetElement, FieldsetProps>(
  ({ label, labelClassName, className, children, ...rest }, ref) => {
    const testId = (rest as { 'data-testid'?: string })['data-testid'];
    const legendTestId = testId ? `${testId}-legend` : undefined;
    const bodyTestId = testId ? `${testId}-body` : undefined;

    return (
      <fieldset
        ref={ref}
        className={cn('min-w-0 border-0 p-0', className)}
        {...rest}
      >
        <legend
          data-testid={legendTestId}
          className={cn(
            'mb-2 block w-full border-b border-ink pb-1 font-mono text-[10px] uppercase tracking-[0.11em] text-ink',
            labelClassName,
          )}
        >
          {label}
        </legend>
        <div data-testid={bodyTestId} className="flex flex-col">
          {children}
        </div>
      </fieldset>
    );
  },
);
Fieldset.displayName = 'Fieldset';
