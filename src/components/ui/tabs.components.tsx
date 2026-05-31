import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  TabsPrimitiveContent,
  TabsPrimitiveList,
  TabsPrimitiveTrigger,
} from './tabs.primitives';

export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitiveList>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitiveList>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveList
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-paper-2 p-1 text-ink-3',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitiveList.displayName;

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsPrimitiveTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitiveTrigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveTrigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitiveTrigger.displayName;

export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitiveContent>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitiveContent>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveContent
    ref={ref}
    className={cn(
      'mt-2 ring-offset-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitiveContent.displayName;
