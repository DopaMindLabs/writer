import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from '@/components/libs/icons';
import { eyebrowRecipe } from './Eyebrow.recipe';
import {
  DropdownMenuPrimitiveContent,
  DropdownMenuPrimitiveItem,
  DropdownMenuPrimitiveLabel,
  DropdownMenuPrimitivePortal,
  DropdownMenuPrimitiveSeparator,
  DropdownMenuPrimitiveSubContent,
  DropdownMenuPrimitiveSubTrigger,
} from './dropdown-menu.primitives';

/**
 * A menu row that opens a nested submenu. Shares the {@link DropdownMenuItem}
 * grammar — same hairline-list wash on hover/keyboard highlight — and adds the
 * trailing `ChevronRight` affordance, which also lights while the submenu is
 * open (`data-[state=open]`).
 */
export const DropdownMenuSubTrigger = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveSubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveSubTrigger>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitiveSubTrigger
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 px-2 py-1.5 text-sm outline-none transition-colors focus:bg-paper-2 focus:text-ink data-[state=open]:bg-paper-2 data-[state=open]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight
      className="ml-auto h-3.5 w-3.5 text-ink-4"
      strokeWidth={1.25}
      aria-hidden
    />
  </DropdownMenuPrimitiveSubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitiveSubTrigger.displayName;

/** The nested panel a {@link DropdownMenuSubTrigger} opens; mirrors {@link DropdownMenuContent}. */
export const DropdownMenuSubContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveSubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveSubContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitivePortal>
    <DropdownMenuPrimitiveSubContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden border border-rule bg-paper p-1 text-ink shadow-overlay-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitivePortal>
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitiveSubContent.displayName;

export const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitiveContent>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitivePortal>
    <DropdownMenuPrimitiveContent
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden border border-rule bg-paper p-1 text-ink shadow-overlay-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
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
      'relative flex cursor-pointer select-none items-center gap-2 px-2 py-1.5 text-sm outline-none transition-colors focus:bg-paper-2 focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
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
      eyebrowRecipe({ size: 10, tone: 'ink3' }),
      'px-2 py-1',
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
