import { StripColorDot } from './StripColorDot';
import type { StripColor, SelectionStripLabels } from './stripLabels';

const ROSTER = 'flex items-center gap-0.5 p-1';
const ITEM =
  'inline-flex h-7 min-w-[28px] items-center justify-center rounded-sm px-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 hover:bg-paper-2 hover:text-ink';
const DIVIDER = 'mx-0.5 h-4 w-px bg-rule';

export interface SelectionStripRosterProps {
  colors: StripColor[];
  currentColorId: string;
  labels: SelectionStripLabels;
  onPickColor: (id: string) => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onOpenNote: () => void;
  onCite?: () => void;
}

/**
 * The strip's default contents: five colour dots (current one ringed) · U · S ·
 * note · (cite). Presentational — every label and handler is passed in.
 */
export const SelectionStripRoster = ({
  colors,
  currentColorId,
  labels,
  onPickColor,
  onUnderline,
  onStrikethrough,
  onOpenNote,
  onCite,
}: SelectionStripRosterProps) => (
  <div className={ROSTER}>
    {colors.map((color) => (
      <StripColorDot
        key={color.id}
        color={color}
        current={color.id === currentColorId}
        onPick={onPickColor}
      />
    ))}
    <span aria-hidden="true" className={DIVIDER} />
    <button
      type="button"
      aria-label={labels.underline}
      data-testid="strip-underline"
      className={`${ITEM} underline`}
      onClick={onUnderline}
    >
      U
    </button>
    <button
      type="button"
      aria-label={labels.strikethrough}
      data-testid="strip-strikethrough"
      className={`${ITEM} line-through`}
      onClick={onStrikethrough}
    >
      S
    </button>
    <span aria-hidden="true" className={DIVIDER} />
    <button type="button" data-testid="strip-note" className={ITEM} onClick={onOpenNote}>
      {labels.note}
    </button>
    {onCite ? (
      <button type="button" data-testid="strip-cite" className={ITEM} onClick={onCite}>
        {labels.cite}
      </button>
    ) : null}
  </div>
);
