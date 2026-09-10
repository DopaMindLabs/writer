import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * A fixed place for a notice that must be visible from anywhere without
 * interrupting anything.
 *
 * There was no such place. `RootLayout` is the only element every screen shares,
 * `SpaceRail` misses Home, About, Templates, Help and Focus, and there is no
 * toast system — so a status that outlives the screen it belongs to had nowhere
 * to live but a one-off `fixed` div, which is what this exists to stop.
 *
 * Out of the flow on purpose: an in-flow element would move the writing surface
 * the moment it appeared, and a notice that shoves the line you are typing is an
 * interruption whatever it says. Bottom-left, away from the reading column and
 * from the actions that sit bottom-right.
 *
 * It takes no focus and traps none. What it holds announces itself politely or
 * not at all — this is somewhere to *put* a notice, not a way to demand
 * attention.
 */

export type NoticeDockProps = HTMLAttributes<HTMLDivElement>;

export const NoticeDock = forwardRef<HTMLDivElement, NoticeDockProps>(
  ({ className, children, ...props }, ref) => (
    // The wrapper spans a corner of the viewport but must never swallow a click
    // meant for the page beneath it; only the notice itself is interactive.
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-40 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      data-testid="notice-dock"
    >
      <div ref={ref} className={cn('pointer-events-auto', className)} {...props}>
        {children}
      </div>
    </div>
  ),
);
NoticeDock.displayName = 'NoticeDock';
