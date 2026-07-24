import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionStrip } from './SelectionStrip';
import { computeStripPosition } from './stripPosition';
import type { SelectionStripLabels, StripColor } from './stripLabels';
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
  noteEyebrow: 'P.1 · HIGHLIGHT + NOTE',
  noteCancelHint: 'ESC CANCELS',
  noteSaveHint: '↵ SAVE',
  notePlaceholder: 'Add a note…',
};

const capture = (rects = [{ x: 0.4, y: 0.5, w: 0.2, h: 0.04 }]): SelectionCapture => ({
  page: 1,
  quote: 'a selected sentence',
  rects,
});

const makePageEl = (): HTMLElement => {
  const el = document.createElement('div');
  el.setAttribute('data-page-number', '1');
  el.getBoundingClientRect = () => new DOMRect(0, 0, 600, 800);
  document.body.appendChild(el);
  return el;
};

const noop = (): void => undefined;

const renderStrip = (overrides: Partial<Parameters<typeof SelectionStrip>[0]> = {}) =>
  render(
    <SelectionStrip
      capture={capture()}
      pageEl={makePageEl()}
      colors={COLORS}
      currentColorId="yellow"
      labels={LABELS}
      onPickColor={noop}
      onUnderline={noop}
      onStrikethrough={noop}
      onSaveNote={noop}
      onDismiss={noop}
      {...overrides}
    />,
  );

describe('computeStripPosition', () => {
  const page = { width: 600, height: 800 };

  it('positions above the selection and clamps to the page', () => {
    // Rect hugging the right edge: the centred strip would overflow, so clamp.
    const pos = computeStripPosition(capture([{ x: 0.9, y: 0.5, w: 0.08, h: 0.04 }]), page, 200, 40);
    expect(pos.placement).toBe('above');
    expect(pos.left).toBeLessThanOrEqual(600 - 200 - 8);
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.top).toBe(0.5 * 800 - 40 - 8);
  });

  it('falls back below the selection near the page top', () => {
    const pos = computeStripPosition(capture([{ x: 0.4, y: 0.01, w: 0.2, h: 0.03 }]), page, 200, 40);
    expect(pos.placement).toBe('below');
    expect(pos.top).toBe((0.01 + 0.03) * 800 + 8);
  });
});

describe('SelectionStrip', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders five dots with the current one pressed', () => {
    renderStrip({ currentColorId: 'blue' });
    COLORS.forEach((color) => {
      expect(screen.getByTestId(`strip-color-${color.id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('strip-color-blue')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('strip-color-yellow')).toHaveAttribute('aria-pressed', 'false');
  });

  it('a dot fires onPickColor and U/S fire their kinds', () => {
    const onPickColor = vi.fn();
    const onUnderline = vi.fn();
    const onStrikethrough = vi.fn();
    renderStrip({ onPickColor, onUnderline, onStrikethrough });
    fireEvent.click(screen.getByTestId('strip-color-pink'));
    fireEvent.click(screen.getByTestId('strip-underline'));
    fireEvent.click(screen.getByTestId('strip-strikethrough'));
    expect(onPickColor).toHaveBeenCalledWith('pink');
    expect(onUnderline).toHaveBeenCalledTimes(1);
    expect(onStrikethrough).toHaveBeenCalledTimes(1);
  });

  it('note grows the editor, escape returns to the strip, enter saves', () => {
    const onSaveNote = vi.fn();
    renderStrip({ onSaveNote });
    fireEvent.click(screen.getByTestId('strip-note'));
    const input = screen.getByTestId('strip-note-input');
    expect(input).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('strip-note-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('strip-note')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('strip-note'));
    const reopened = screen.getByTestId('strip-note-input');
    fireEvent.change(reopened, { target: { value: 'my note' } });
    fireEvent.keyDown(reopened, { key: 'Enter' });
    expect(onSaveNote).toHaveBeenCalledWith('my note');
  });

  it('omits cite unless an onCite handler is given', () => {
    const { rerender } = renderStrip();
    expect(screen.queryByTestId('strip-cite')).not.toBeInTheDocument();
    rerender(
      <SelectionStrip
        capture={capture()}
        pageEl={makePageEl()}
        colors={COLORS}
        currentColorId="yellow"
        labels={LABELS}
        onPickColor={noop}
        onUnderline={noop}
        onStrikethrough={noop}
        onSaveNote={noop}
        onCite={noop}
        onDismiss={noop}
      />,
    );
    expect(screen.getByTestId('strip-cite')).toBeInTheDocument();
  });

  it('pointerdown outside dismisses', () => {
    const onDismiss = vi.fn();
    renderStrip({ onDismiss });
    fireEvent.pointerDown(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
