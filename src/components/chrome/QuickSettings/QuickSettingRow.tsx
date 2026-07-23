import type { ReactNode } from 'react';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';
import { cn } from '@/lib/utils';

export interface QuickSettingRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  /** Draw the hairline under the row. On by default; off merges the row with the next. */
  divider?: boolean;
}

/**
 * A single labelled control row inside Quick Settings: the label (and an
 * optional mono hint) on the left, the control aligned to the right. The hint is
 * dropped on a coarse pointer, since a keyboard cue is meaningless without a
 * keyboard.
 */
export const QuickSettingRow = ({
  label,
  hint,
  children,
  divider = true,
}: QuickSettingRowProps) => {
  const coarsePointer = useCoarsePointer();
  const showHint = hint && !coarsePointer;
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-2.5',
        divider && 'border-b border-rule/60',
      )}
    >
      <div className="min-w-0 pt-px">
        <div className="text-[12px] font-medium text-ink">{label}</div>
        {showHint && (
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
            {hint}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end">{children}</div>
    </div>
  );
};
