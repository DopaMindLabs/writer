import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface PillToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  on: boolean;
  onToggle: () => void;
  label: string;
}

export const PillToggle = forwardRef<HTMLButtonElement, PillToggleProps>(
  ({ on, onToggle, label, className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
        on ? 'border-ink bg-ink' : 'border-rule bg-paper-2',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[1px] left-[1px] h-3 w-3 rounded-full bg-paper transition-transform',
          on ? 'translate-x-3' : 'translate-x-0',
        )}
      />
    </button>
  ),
);
PillToggle.displayName = 'PillToggle';
