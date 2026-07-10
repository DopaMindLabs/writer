import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenuPrimitiveContent,
  DropdownMenuPrimitiveItem,
  DropdownMenuPrimitiveLabel,
  DropdownMenuPrimitivePortal,
  DropdownMenuPrimitiveSeparator,
} from './dropdown-menu.primitives';

export const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitivePortal>
    <DropdownMenuPrimitiveContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-md border border-rule bg-paper p-1 text-ink shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitivePortal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitiveContent.displayName;

export const DropdownMenuItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveItem>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-paper-2 focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitiveItem.displayName;

export const DropdownMenuLabel = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveLabel>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveLabel>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveLabel
    ref={ref}
    className={cn(
      'px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3',
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitiveLabel.displayName;

export const DropdownMenuSeparator = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveSeparator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveSeparator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitiveSeparator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-rule', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitiveSeparator.displayName;
