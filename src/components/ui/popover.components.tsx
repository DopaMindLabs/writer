import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  PopoverPrimitiveContent,
  PopoverPrimitivePortal,
} from './popover.primitives';

export const PopoverContent = forwardRef<
  React.ComponentRef<typeof PopoverPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitiveContent>
>(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitivePortal>
    <PopoverPrimitiveContent
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        'z-50 border border-rule bg-paper text-ink shadow-overlay-popover outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  </PopoverPrimitivePortal>
));
PopoverContent.displayName = PopoverPrimitiveContent.displayName;
