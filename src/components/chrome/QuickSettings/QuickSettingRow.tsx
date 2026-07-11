import type { ReactNode } from 'react';
import { useCoarsePointer } from '@/hooks/useCoarsePointer';

export type QuickSettingSize = 'compact' | 'roomy';

export interface QuickSettingRowProps {
  label: string;
  hint?: ReactNode;
  /** `compact` is the desktop popover density; `roomy` is a ≥44 px touch row. */
  size?: QuickSettingSize;
  children: ReactNode;
}

/**
 * A single labelled control row inside Quick Settings: the label (and an
 * optional mono hint) on the left, the control aligned to the right. The
 * `roomy` size drops the hint and grows the row to a comfortable tap target for
 * the mobile More sheet; the hint is also dropped on any coarse pointer, since a
 * keyboard cue is meaningless without a keyboard.
 */
export const QuickSettingRow = ({
  label,
  hint,
  size = 'compact',
  children,
}: QuickSettingRowProps) => {
  const coarsePointer = useCoarsePointer();
  const roomy = size === 'roomy';
  const showHint = hint && !roomy && !coarsePointer;
  const rowClass = roomy
    ? 'grid grid-cols-[1fr_auto] items-center gap-3 border-b border-rule/60 px-4 min-h-11 py-3'
    : 'grid grid-cols-[1fr_auto] items-start gap-3 border-b border-rule/60 px-4 py-2.5';
  const labelClass = roomy
    ? 'text-[14px] font-medium text-ink'
    : 'text-[12px] font-medium text-ink';
  return (
    <div className={rowClass}>
      <div className="min-w-0 pt-px">
        <div className={labelClass}>{label}</div>
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
