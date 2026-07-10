import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { SeparatorPrimitiveRoot } from './separator.primitives';

type SeparatorPrimitiveProps = React.ComponentPropsWithoutRef<
  typeof SeparatorPrimitiveRoot
>;

export interface SeparatorProps extends SeparatorPrimitiveProps {
  light?: boolean;
}

export const Separator = forwardRef<
  React.ComponentRef<typeof SeparatorPrimitiveRoot>,
  SeparatorProps
>(
  (
    {
      className,
      orientation = 'horizontal',
      decorative = true,
      light = false,
      ...props
    },
    ref,
  ) => (
    <SeparatorPrimitiveRoot
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0',
        light ? 'bg-rule-s' : 'bg-rule',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = SeparatorPrimitiveRoot.displayName;
