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
  it('renders the back link and all three reader toggles on the grey bar', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem />,
    );
    const bar = screen.getByTestId('media-reader-toolbar');
    expect(bar).toHaveClass('bg-paper-2');
    expect(screen.getByTestId('media-viewer-back')).toHaveAttribute('href', '/s/s1/library');
    expect(screen.getByTestId('pdf-thumbs-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-rail-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-focus-toggle')).toHaveAccessibleName('Focus mode');
  });

  it('keeps the back link but omits the toggles while the item is loading', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem={false} />,
    );
    expect(screen.getByTestId('media-viewer-back')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-rail-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-focus-toggle')).not.toBeInTheDocument();
  });

  it('folds the thumbs and panel toggles away in focus mode, keeping back and focus', () => {
    renderWithProviders(
      <MediaReaderToolbar spaceId="s1" mediaId="m1" hasItem />,
      { initialEntries: ['/?focus=1'] },
    );
    expect(screen.getByTestId('media-viewer-back')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-focus-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-thumbs-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pdf-rail-toggle')).not.toBeInTheDocument();
  });
});
