import { forwardRef } from 'react';
import { SeparatorPrimitive } from '@/components/libs/primitives';
import { cn } from '@/lib/utils';

type SeparatorPrimitiveProps = React.ComponentPropsWithoutRef<
  typeof SeparatorPrimitive.Root
>;

export interface SeparatorProps extends SeparatorPrimitiveProps {
  light?: boolean;
}

export const Separator = forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
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
    <SeparatorPrimitive.Root
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
Separator.displayName = SeparatorPrimitive.Root.displayName;
