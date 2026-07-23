import type { ReactNode } from 'react';
import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { cn } from '@/lib/utils';

export interface QuickLinkProps {
  to: string;
  label: string;
  /** A keyboard hint (compose a `Kbd`). Hidden on touch, where there's no key. */
  kbd?: ReactNode;
  testId: string;
  divider?: boolean;
}

/**
 * A single navigation-link row in Quick Settings: the underlined link on the
 * left, an optional keyboard hint on the right. Closes the popover on
 * navigation.
 */
export const QuickLink = ({ to, label, kbd, testId, divider }: QuickLinkProps) => {
  const coarsePointer = useCoarsePointer();
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        divider && 'border-t border-rule/60',
      )}
    >
      <PopoverClose asChild>
        <Link
          to={to}
          className="inline-flex items-center gap-1 border-b border-ink pb-px text-[12px] font-medium text-ink"
          data-testid={testId}
        >
          {label}
        </Link>
      </PopoverClose>
      <span className="flex-1" />
      {kbd && !coarsePointer ? kbd : null}
    </div>
  );
};
