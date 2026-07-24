import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import { AnnotationLayer } from '@/pdf-annotator';
import type { PdfAnnotation } from '@/db/schema';
import type { PdfAnnotator } from '@/hooks/usePdfAnnotator';
import { PdfMarkContextMenu } from './PdfMarkContextMenu';

const mark = (overrides: Partial<PdfAnnotation> = {}): PdfAnnotation => ({
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
  quote: 'a highlighted sentence',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makeAnnotator = (): PdfAnnotator => ({
  color: 'yellow',
  setColor: vi.fn(),
  annotations: [],
  capture: null,
  handleCapture: vi.fn(),
  clearCapture: vi.fn(),
  apply: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  recolor: vi.fn(async () => undefined),
  setNote: vi.fn(async () => undefined),
});

const renderMenu = (annotation: PdfAnnotation, annotator: PdfAnnotator) =>
  renderWithProviders(
    <PdfMarkContextMenu annotations={[annotation]} annotator={annotator}>
      <AnnotationLayer annotations={[annotation]} page={1} getMarkLabel={() => 'mark'} />
    </PdfMarkContextMenu>,
  );

const openOnMark = (): HTMLElement => {
  const button = screen.getByTestId('pdf-highlight-mark');
  fireEvent.contextMenu(button, { clientX: 8, clientY: 8 });
  return button;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PdfMarkContextMenu', () => {
  it('removes a mark', async () => {
    const annotator = makeAnnotator();
    renderMenu(mark(), annotator);
    openOnMark();
    fireEvent.click(await screen.findByTestId('mark-remove'));
    expect(annotator.remove).toHaveBeenCalledWith('h1');
  });

  it('recolours a mark', async () => {
    const annotator = makeAnnotator();
    renderMenu(mark(), annotator);
    openOnMark();
    fireEvent.click(await screen.findByTestId('mark-color-blue'));
    expect(annotator.recolor).toHaveBeenCalledWith('h1', 'blue');
  });

  it('opens the note editor prefilled and saves', async () => {
    const annotator = makeAnnotator();
    renderMenu(mark({ note: 'prior note' }), annotator);
    openOnMark();
    fireEvent.click(await screen.findByTestId('mark-edit-note'));
    const input = await screen.findByTestId('strip-note-input');
    expect(input).toHaveValue('prior note');
    fireEvent.change(input, { target: { value: 'updated note' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(annotator.setNote).toHaveBeenCalledWith('h1', 'updated note');
  });

  it('clears the note when an empty note is saved', async () => {
    const annotator = makeAnnotator();
    renderMenu(mark({ note: 'prior note' }), annotator);
    openOnMark();
    fireEvent.click(await screen.findByTestId('mark-edit-note'));
    const input = await screen.findByTestId('strip-note-input');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(annotator.setNote).toHaveBeenCalledWith('h1', '');
  });

  it('opens from a focused mark (the keyboard menu key emits a contextmenu event)', async () => {
    renderMenu(mark(), makeAnnotator());
    const button = screen.getByTestId('pdf-highlight-mark');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.contextMenu(button, { clientX: 8, clientY: 8 });
    const menu = await screen.findByTestId('pdf-mark-menu');
    expect(menu).toBeInTheDocument();
    // Close it so the portal tears down cleanly at test end.
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('pdf-mark-menu')).not.toBeInTheDocument();
    });
  });

  it('shows no custom menu when right-clicking empty ground', () => {
    renderMenu(mark(), makeAnnotator());
    fireEvent.contextMenu(screen.getByTestId('pdf-highlight-layer'), { clientX: 8, clientY: 8 });
    expect(screen.queryByTestId('pdf-mark-menu')).not.toBeInTheDocument();
  });
});
