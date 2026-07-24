import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import type { PdfSelectionCapture } from '@/pdf-annotator';
import type { PdfAnnotator } from '@/hooks/usePdfAnnotator';
import { PdfSelectionStrip } from './PdfSelectionStrip';

const capture: PdfSelectionCapture = {
  page: 3,
  quote: 'a selected sentence',
  rects: [{ x: 0.3, y: 0.4, w: 0.3, h: 0.04 }],
};

const makePageEl = (): HTMLElement => {
  const el = document.createElement('div');
  el.setAttribute('data-page-number', '3');
  el.getBoundingClientRect = () => new DOMRect(0, 0, 600, 800);
  document.body.appendChild(el);
  return el;
};

const makeAnnotator = (): PdfAnnotator => ({
  color: 'yellow',
  setColor: vi.fn(),
  annotations: [],
  capture,
  handleCapture: vi.fn(),
  clearCapture: vi.fn(),
  apply: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  recolor: vi.fn(async () => undefined),
  setNote: vi.fn(async () => undefined),
});

describe('PdfSelectionStrip', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('labels the strip and the swatches from i18n', () => {
    renderWithProviders(
      <PdfSelectionStrip capture={capture} pageEl={makePageEl()} annotator={makeAnnotator()} />,
    );
    expect(screen.getByTestId('pdf-selection-strip')).toHaveAttribute(
      'aria-label',
      'Annotate selection',
    );
    expect(screen.getByTestId('strip-color-ash')).toHaveAttribute('aria-label', 'Lavender');
    expect(screen.getByTestId('strip-color-yellow')).toHaveAttribute('aria-pressed', 'true');
  });

  it('picks a colour: sets the preference and applies a highlight', () => {
    const annotator = makeAnnotator();
    renderWithProviders(
      <PdfSelectionStrip capture={capture} pageEl={makePageEl()} annotator={annotator} />,
    );
    fireEvent.click(screen.getByTestId('strip-color-pink'));
    expect(annotator.setColor).toHaveBeenCalledWith('pink');
    expect(annotator.apply).toHaveBeenCalledWith({ kind: 'highlight', color: 'pink' });
  });

  it('U and S apply their kinds in the current colour', () => {
    const annotator = makeAnnotator();
    renderWithProviders(
      <PdfSelectionStrip capture={capture} pageEl={makePageEl()} annotator={annotator} />,
    );
    fireEvent.click(screen.getByTestId('strip-underline'));
    fireEvent.click(screen.getByTestId('strip-strikethrough'));
    expect(annotator.apply).toHaveBeenCalledWith({ kind: 'underline', color: 'yellow' });
    expect(annotator.apply).toHaveBeenCalledWith({ kind: 'strikethrough', color: 'yellow' });
  });

  it('saving a note applies a highlight with the note attached', () => {
    const annotator = makeAnnotator();
    renderWithProviders(
      <PdfSelectionStrip capture={capture} pageEl={makePageEl()} annotator={annotator} />,
    );
    fireEvent.click(screen.getByTestId('strip-note'));
    const input = screen.getByTestId('strip-note-input');
    fireEvent.change(input, { target: { value: 'remember this' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(annotator.apply).toHaveBeenCalledWith({
      kind: 'highlight',
      color: 'yellow',
      note: 'remember this',
    });
  });

  it('omits the cite action (no programmatic citation entry point)', () => {
    renderWithProviders(
      <PdfSelectionStrip capture={capture} pageEl={makePageEl()} annotator={makeAnnotator()} />,
    );
    expect(screen.queryByTestId('strip-cite')).not.toBeInTheDocument();
  });
});
