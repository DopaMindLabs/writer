import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check } from '@/components/libs/icons';
import { Icon } from './icon';
import { eyebrowRecipe } from './Eyebrow.recipe';
import {
  ContextMenuPrimitiveContent,
  ContextMenuPrimitiveItem,
  ContextMenuPrimitiveItemIndicator,
  ContextMenuPrimitiveLabel,
  ContextMenuPrimitivePortal,
  ContextMenuPrimitiveRadioItem,
  ContextMenuPrimitiveSeparator,
} from './context-menu.primitives';

const CONTENT_CLASS =
  'z-50 min-w-[11rem] overflow-hidden border border-rule bg-paper p-1 text-ink shadow-overlay-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

const ITEM_CLASS =
  'relative flex cursor-pointer select-none items-center gap-2 px-2 py-1.5 text-sm outline-none transition-colors focus:bg-paper-2 focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export const ContextMenuContent = forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitivePortal>
    <ContextMenuPrimitiveContent
      ref={ref}
      className={cn(CONTENT_CLASS, className)}
      {...props}
    />
  </ContextMenuPrimitivePortal>
));
ContextMenuContent.displayName = ContextMenuPrimitiveContent.displayName;

export const ContextMenuItem = forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveItem>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitiveItem ref={ref} className={cn(ITEM_CLASS, className)} {...props} />
));
ContextMenuItem.displayName = ContextMenuPrimitiveItem.displayName;

export const ContextMenuRadioItem = forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitiveRadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveRadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitiveRadioItem
    ref={ref}
    className={cn(ITEM_CLASS, 'pl-7', className)}
    {...props}
  >
    <span className="absolute left-2 flex items-center justify-center">
      <ContextMenuPrimitiveItemIndicator>
        <Icon icon={Check} size="xs" />
      </ContextMenuPrimitiveItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitiveRadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitiveRadioItem.displayName;

export const ContextMenuLabel = forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitiveLabel>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveLabel>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitiveLabel
    ref={ref}
    className={cn(eyebrowRecipe({ size: 10, tone: 'ink3' }), 'px-2 py-1', className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitiveLabel.displayName;

export const ContextMenuSeparator = forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitiveSeparator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitiveSeparator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitiveSeparator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-rule', className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitiveSeparator.displayName;
