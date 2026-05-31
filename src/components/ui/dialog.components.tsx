import { forwardRef, type HTMLAttributes } from 'react';
import { X } from '@/components/libs/icons';
import { cn } from '@/lib/utils';
import {
  DialogPrimitiveClose,
  DialogPrimitiveContent,
  DialogPrimitiveDescription,
  DialogPrimitiveOverlay,
  DialogPrimitivePortal,
  DialogPrimitiveTitle,
} from './dialog.primitives';

export const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitiveOverlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveOverlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitiveOverlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitiveOverlay.displayName;

export const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveContent>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitivePortal>
    <DialogOverlay />
    <DialogPrimitiveContent
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-rule bg-paper p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitiveClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-paper transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ink">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitiveClose>
    </DialogPrimitiveContent>
  </DialogPrimitivePortal>
));
DialogContent.displayName = DialogPrimitiveContent.displayName;

export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left',
        className,
      )}
      {...props}
    />
  );
};

export const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitiveTitle>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveTitle>
>(({ className, ...props }, ref) => (
  <DialogPrimitiveTitle
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitiveTitle.displayName;

export const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitiveDescription>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitiveDescription>
>(({ className, ...props }, ref) => (
  <DialogPrimitiveDescription
    ref={ref}
    className={cn('text-sm text-ink-3', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitiveDescription.displayName;
