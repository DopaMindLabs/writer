import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  ScrollAreaPrimitiveCorner,
  ScrollAreaPrimitiveRoot,
  ScrollAreaPrimitiveScrollbar,
  ScrollAreaPrimitiveThumb,
  ScrollAreaPrimitiveViewport,
} from './scroll-area.primitives';

export const ScrollArea = forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitiveRoot>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitiveRoot
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitiveViewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitiveViewport>
    <ScrollBar />
    <ScrollAreaPrimitiveCorner />
  </ScrollAreaPrimitiveRoot>
));
ScrollArea.displayName = ScrollAreaPrimitiveRoot.displayName;

export const ScrollBar = forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitiveScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitiveScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitiveScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' &&
        'h-full w-2 border-l border-l-transparent p-px',
      orientation === 'horizontal' &&
        'h-2 flex-col border-t border-t-transparent p-px',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitiveThumb className="relative flex-1 rounded-full bg-ink-4" />
  </ScrollAreaPrimitiveScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitiveScrollbar.displayName;
