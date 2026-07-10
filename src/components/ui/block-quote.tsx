import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const BlockQuote = forwardRef<
  HTMLQuoteElement,
  HTMLAttributes<HTMLQuoteElement> & { cite?: React.ReactNode }
>(({ className, children, cite, ...props }, ref) => (
  <blockquote
    ref={ref}
    className={cn(
      'my-6 border-l-2 border-ink px-5 py-1 font-serif text-[18px] italic leading-[1.5] text-ink',
      '[&>p+p]:mt-2',
      className,
    )}
    {...props}
  >
    {children}
    {cite && (
      <div className="mt-2.5 font-mono text-[10px] not-italic tracking-[0.04em] text-ink-4">
        {cite}
      </div>
    )}
  </blockquote>
));
BlockQuote.displayName = 'BlockQuote';
