import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * "Skip to content" link (WCAG 2.4.1 Bypass Blocks). Hidden until it receives
 * keyboard focus, at which point it becomes a visible, ink-filled chip in the
 * top-left. Render it as the first focusable element of the app shell, pointing
 * at the `id` of the main landmark.
 */
export const SkipLink = ({
  targetId = 'main-content',
  children = 'Skip to content',
  className,
}: {
  targetId?: string;
  children?: ReactNode;
  className?: string;
}) => (
  <a
    href={`#${targetId}`}
    className={cn(
      'sr-only',
      'focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]',
      'focus:bg-ink focus:px-4 focus:py-2 focus:font-sans focus:text-[13px]',
      'focus:text-paper focus:no-underline',
      'focus:outline-none focus:ring-1 focus:ring-ink focus:ring-offset-2',
      className,
    )}
  >
    {children}
  </a>
);
