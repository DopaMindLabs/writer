import { describe, it, expect } from 'vitest';
import { renderAtRoute, screen } from '@/test/test-utils';
import { PdfReaderFocusToggle } from './PdfReaderFocusToggle';

const renderAt = (initialPath: string) =>
  renderAtRoute(<PdfReaderFocusToggle />, {
    path: '/s/:spaceId/library/:mediaId',
    initialEntries: [initialPath],
  });

describe('PdfReaderFocusToggle', () => {
  it('offers to enter focus mode and links with the flag set', () => {
    renderAt('/s/s1/library/m1');
    const link = screen.getByTestId('pdf-focus-toggle');
    expect(link).toHaveAccessibleName('Focus mode');
    expect(link).toHaveAttribute('href', '/s/s1/library/m1?focus=1');
  });

  it('offers to exit focus mode and links with the flag cleared', () => {
    renderAt('/s/s1/library/m1?focus=1');
    const link = screen.getByTestId('pdf-focus-toggle');
    expect(link).toHaveAccessibleName('Exit focus mode');
    expect(link).toHaveAttribute('href', '/s/s1/library/m1');
  });

  it('preserves other query params when toggling', () => {
    renderAt('/s/s1/library/m1?panel=info');
    expect(screen.getByTestId('pdf-focus-toggle')).toHaveAttribute(
      'href',
      '/s/s1/library/m1?panel=info&focus=1',
    );
  });
});
