import { forwardRef, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { eyebrowRecipe } from '@/components/ui/Eyebrow.recipe';

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
            eyebrowRecipe({ tone: 'ink' }),
            'mb-2 block w-full border-b border-ink pb-1',
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
