import { type ComponentPropsWithoutRef } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cn } from '@/lib/utils';

type VisuallyHiddenProps = ComponentPropsWithoutRef<'span'> & {
  /** Apply the treatment to the single child element instead of a wrapper. */
  asChild?: boolean;
};

/**
 * Hides content visually while keeping it in the accessibility tree. Forwards
 * standard span attributes, so it can also host an `aria-live` region for
 * screen-reader announcements without a bespoke wrapper.
 */
export const VisuallyHidden = ({
  asChild = false,
  className,
  ...rest
}: VisuallyHiddenProps) => {
  const Comp = asChild ? Slot : 'span';
  return <Comp className={cn('sr-only', className)} {...rest} />;
};
