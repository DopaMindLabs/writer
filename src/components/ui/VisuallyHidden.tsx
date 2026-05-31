import { type ReactNode } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cn } from '@/lib/utils';

/**
 * Hides content visually while keeping it available to assistive technology.
 * A named primitive for screen-reader-only text that formalises the ad-hoc
 * `sr-only` usage across the app. Use `asChild` to apply the treatment to an
 * existing element instead of wrapping in a `<span>`.
 */
export const VisuallyHidden = ({
  children,
  asChild = false,
  className,
}: {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}) => {
  const Comp = asChild ? Slot : 'span';
  return <Comp className={cn('sr-only', className)}>{children}</Comp>;
};
