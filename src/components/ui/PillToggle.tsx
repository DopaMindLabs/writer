import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Track / knob geometry per size. `sm` is the historical default. */
const SIZES = {
  sm: { track: 'h-4 w-7', knob: 'h-3 w-3', on: 'translate-x-3' },
  md: { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5' },
} as const;

export type PillToggleSize = keyof typeof SIZES;

export interface PillToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  on: boolean;
  onToggle: () => void;
  label: string;
  /** `sm` (default) is the compact popover switch; `md` fills a ≥44 px touch row. */
  size?: PillToggleSize;
}

export const PillToggle = forwardRef<HTMLButtonElement, PillToggleProps>(
  ({ on, onToggle, label, size = 'sm', className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        `relative inline-flex ${SIZES[size].track} shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink`,
        on ? 'border-ink bg-ink' : 'border-rule bg-paper-2',
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          `absolute top-[1px] left-[1px] ${SIZES[size].knob} rounded-full bg-paper transition-transform`,
          on ? SIZES[size].on : 'translate-x-0',
        )}
      />
    </button>
  ),
);
PillToggle.displayName = 'PillToggle';
