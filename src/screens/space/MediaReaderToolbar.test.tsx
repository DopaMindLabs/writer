import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { MediaReaderToolbar } from './MediaReaderToolbar';

beforeEach(() => {
  act(() => {
    useUI.setState({ pdfReaderPrefs: {} });
  });
});

describe('MediaReaderToolbar', () => {
  it('renders the back link and the thumbnail toggle on the grey bar', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem />,
    );
    const bar = screen.getByTestId('media-reader-toolbar');
    expect(bar).toHaveClass('bg-paper-2');
    expect(screen.getByTestId('media-viewer-back')).toHaveAttribute('href', '/s/s1/library');
    expect(screen.getByTestId('pdf-thumbs-toggle')).toBeInTheDocument();
    // The panel and focus toggles live in the shared topbar, not on this bar.
    expect(screen.queryByTestId('pdf-rail-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-focus-toggle')).not.toBeInTheDocument();
  });

  it('does not underline the back arrow', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem />,
    );
    expect(screen.getByTestId('media-viewer-back')).not.toHaveClass('border-b');
  });

  it('keeps the back link but omits the thumbnail toggle while the item is loading', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem={false} />,
    );
    expect(screen.getByTestId('media-viewer-back')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
  });

  it('folds the thumbnail toggle away in focus mode, keeping the back link', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem />,
      { initialEntries: ['/?focus=1'] },
    );
    expect(screen.getByTestId('media-viewer-back')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
  });
});
