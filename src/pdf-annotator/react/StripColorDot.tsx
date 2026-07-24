import type { StripColor } from './stripLabels';

const DOT_BUTTON = 'flex h-7 w-7 items-center justify-center rounded-sm hover:bg-paper-2';
const RING = 'ring-2 ring-ink ring-offset-2 ring-offset-paper';

export interface StripColorDotProps {
  color: StripColor;
  current: boolean;
  onPick: (id: string) => void;
}

/** One colour swatch in the strip roster; ringed when it is the current colour. */
export const StripColorDot = ({ color, current, onPick }: StripColorDotProps) => (
  <button
    type="button"
    aria-label={color.label}
    aria-pressed={current}
    data-testid={`strip-color-${color.id}`}
    className={DOT_BUTTON}
    onClick={() => {
      onPick(color.id);
    }}
  >
    <span
      aria-hidden="true"
      className={`h-3.5 w-3.5 rounded-full ${color.swatchClassName} ${current ? RING : ''}`}
    />
  </button>
);
