import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  TooltipPrimitiveContent,
  TooltipPrimitivePortal,
} from './tooltip.primitives';

export const TooltipContent = forwardRef<
  React.ComponentRef<typeof TooltipPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitiveContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitivePortal>
    <TooltipPrimitiveContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-ink px-2 py-1 text-xs text-paper shadow-md animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    />
  </TooltipPrimitivePortal>
));
TooltipContent.displayName = TooltipPrimitiveContent.displayName;
