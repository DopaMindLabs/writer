import { forwardRef, type HTMLAttributes } from 'react';
import { TypographyLabel, TypographyP } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional eyebrow-style heading shown above the caption. */
  title?: string;
  caption: string;
}

/** Dashed, centered placeholder card for when a list or feature has nothing to
 * show (no history yet, an unsupported browser). */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, caption, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mx-auto mt-6 max-w-md border border-dashed border-rule bg-paper-2/40 p-6 text-center',
        className,
      )}
      {...props}
    >
      {title !== undefined ? (
        <TypographyLabel asChild>
          <h3 className="mb-2">{title}</h3>
        </TypographyLabel>
      ) : null}
      <TypographyP variant="caption" className="text-[14px] text-ink-2">
        {caption}
      </TypographyP>
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';
