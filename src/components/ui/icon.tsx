import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconSize = 'xs' | 'sm' | 'md';

const ICON_SIZE: Record<IconSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ icon: I, size = 'sm', className, strokeWidth }: IconProps) {
  return (
    <I
      className={cn(ICON_SIZE[size], className)}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  );
}

export type IconButtonSize = 'sm' | 'md';

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string;
  buttonSize?: IconButtonSize;
  iconSize?: IconSize;
  active?: boolean;
  strokeWidth?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      buttonSize = 'sm',
      iconSize = 'sm',
      active,
      strokeWidth,
      className,
      type,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        aria-label={label}
        aria-pressed={typeof active === 'boolean' ? active : undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          buttonSize === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          active
            ? 'text-ink hover:bg-paper-2'
            : 'text-ink-3 hover:bg-paper-2 hover:text-ink',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
          'data-[state=open]:bg-paper-2 data-[state=open]:text-ink',
          className,
        )}
        {...rest}
      >
        <Icon icon={icon} size={iconSize} strokeWidth={strokeWidth} />
      </button>
    );
  },
);
