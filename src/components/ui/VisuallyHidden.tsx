import { type ReactNode } from 'react';
import { Slot } from '@/components/libs/primitives';
import { cn } from '@/lib/utils';

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
