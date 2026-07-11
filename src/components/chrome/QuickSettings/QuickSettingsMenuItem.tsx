import type { ReactNode } from 'react';
import { Check } from '@/components/libs/icons';
import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  children: ReactNode;
  kbd?: string;
  onClick?: () => void;
  asChild?: boolean;
  href?: string;
  done?: boolean;
  testId?: string;
}

const MenuItemInner = ({
  children,
  kbd,
  done,
  testId,
}: Pick<MenuItemProps, 'children' | 'kbd' | 'done' | 'testId'>) => (
  <span className="flex w-full items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2 hover:bg-paper-2">
    {typeof done === 'boolean' && (
      <Check
        data-testid={testId ? `${testId}-check` : undefined}
        className={cn(
          'h-3 w-3 shrink-0',
          done ? 'text-ink opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
    )}
    <span className="flex-1 text-left">{children}</span>
    {kbd && (
      <span
        data-testid={testId ? `${testId}-kbd` : undefined}
        className="font-mono text-[10px] text-ink-4"
      >
        {kbd}
      </span>
    )}
  </span>
);

/**
 * Transitional local menu row for Quick Settings — replaced by the shared
 * `ui/MenuItem` once the folder is composed from primitives.
 */
export const MenuItem = ({
  children,
  kbd,
  onClick,
  asChild,
  href,
  done,
  testId,
}: MenuItemProps) => {
  const inner = (
    <MenuItemInner kbd={kbd} done={done} testId={testId}>
      {children}
    </MenuItemInner>
  );
  if (asChild && href) {
    return (
      <PopoverClose asChild>
        <Link to={href} className="block w-full text-left" data-testid={testId}>
          {inner}
        </Link>
      </PopoverClose>
    );
  }
  return (
    <PopoverClose asChild>
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="block w-full text-left"
      >
        {inner}
      </button>
    </PopoverClose>
  );
};
