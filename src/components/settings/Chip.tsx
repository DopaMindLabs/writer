import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={active ? 'true' : 'false'}
      className={cn(
        'inline-flex items-center justify-center border px-3.5 py-1.5 text-[12px] tracking-[0.01em] transition-colors',
        active
          ? 'border-ink bg-ink font-medium text-paper'
          : 'border-rule bg-paper text-ink hover:border-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
