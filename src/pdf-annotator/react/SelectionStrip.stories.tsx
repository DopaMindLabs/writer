import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useEffect, useState } from 'react';
import { SelectionStrip } from './SelectionStrip';
import type { StripColor, SelectionStripLabels } from './stripLabels';
import type { SelectionCapture } from '../core/types';

const COLORS: StripColor[] = [
  { id: 'yellow', swatchClassName: 'bg-hl-yellow', label: 'Yellow' },
  { id: 'pink', swatchClassName: 'bg-hl-pink', label: 'Pink' },
  { id: 'blue', swatchClassName: 'bg-hl-blue', label: 'Blue' },
  { id: 'green', swatchClassName: 'bg-hl-green', label: 'Green' },
  { id: 'ash', swatchClassName: 'bg-hl-ash', label: 'Lavender' },
];

const LABELS: SelectionStripLabels = {
  toolbar: 'Annotate selection',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  note: 'note',
  cite: 'cite',
  noteEyebrow: 'P.12 · HIGHLIGHT + NOTE',
  noteCancelHint: 'ESC CANCELS',
  noteSaveHint: '↵ SAVE',
  notePlaceholder: 'Add a note…',
};

const capture: SelectionCapture = {
  page: 12,
  quote: 'a selected sentence',
  rects: [{ x: 0.3, y: 0.4, w: 0.4, h: 0.04 }],
};

const noop = (): void => undefined;

/** Hosts the strip inside a mock page box so it can measure and position. */
const StripHost = () => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageEl, setPageEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPageEl(pageRef.current);
  }, []);
  return (
    <div
      ref={pageRef}
      data-page-number="12"
      className="relative h-80 w-[520px] bg-paper-2"
    >
      {pageEl ? (
        <SelectionStrip
          capture={capture}
          pageEl={pageEl}
          colors={COLORS}
          currentColorId="yellow"
          labels={LABELS}
          onPickColor={noop}
          onUnderline={noop}
          onStrikethrough={noop}
          onSaveNote={noop}
          onDismiss={noop}
        />
      ) : null}
    </div>
  );
};

// The strip requires a live `pageEl` to measure against, so the story renders it
// through `StripHost` rather than binding args directly.
const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/SelectionStrip',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <StripHost /> };
