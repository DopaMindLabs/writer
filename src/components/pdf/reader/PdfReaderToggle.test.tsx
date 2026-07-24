import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Files, PanelRight } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { PdfReaderToggle } from './PdfReaderToggle';

beforeEach(() => {
  act(() => {
    useUI.setState({ pdfReaderPrefs: {} });
  });
});

describe('PdfReaderToggle', () => {
  it('reflects and writes the thumbs preference for its media id', async () => {
    renderWithProviders(
      <PdfReaderToggle
        mediaId="m1"
        icon={Files}
        label="Page thumbnails"
        testId="pdf-thumbs-toggle"
        field="thumbs"
      />,
    );
    const button = screen.getByTestId('pdf-thumbs-toggle');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(useUI.getState().pdfReaderPrefs.m1.thumbs).toBe(true);
  });

  it('reads railHidden inverted: pressed means the rail is shown', async () => {
    renderWithProviders(
      <PdfReaderToggle
        mediaId="m1"
        icon={PanelRight}
        label="Reader panels"
        testId="pdf-rail-toggle"
        field="railHidden"
        invert
      />,
    );
    const button = screen.getByTestId('pdf-rail-toggle');
    // Default railHidden=false → the rail is shown → pressed.
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(useUI.getState().pdfReaderPrefs.m1.railHidden).toBe(true);
  });

  it('keeps each media id independent', async () => {
    const { rerender } = renderWithProviders(
      <PdfReaderToggle
        mediaId="m1"
        icon={Files}
        label="Page thumbnails"
        testId="pdf-thumbs-toggle"
        field="thumbs"
      />,
    );
    await userEvent.click(screen.getByTestId('pdf-thumbs-toggle'));
    rerender(
      <PdfReaderToggle
        mediaId="m2"
        icon={Files}
        label="Page thumbnails"
        testId="pdf-thumbs-toggle"
        field="thumbs"
      />,
    );
    // m2 has its own (default) memory.
    expect(screen.getByTestId('pdf-thumbs-toggle')).toHaveAttribute('aria-pressed', 'false');
  });
});
