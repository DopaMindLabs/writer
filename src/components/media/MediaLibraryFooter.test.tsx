import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { MediaLibraryFooter } from './MediaLibraryFooter';

describe('MediaLibraryFooter', () => {
  it('counts the shown rows of the total', () => {
    renderWithProviders(<MediaLibraryFooter shown={3} total={5} />);
    expect(screen.getByTestId('media-library-footer-count')).toHaveTextContent(
      'Showing 3 of 5',
    );
  });

  it('emphasises the brain-space words', () => {
    const { container } = renderWithProviders(
      <MediaLibraryFooter shown={1} total={1} />,
    );
    const strong = container.querySelector('strong');
    expect(strong).toHaveTextContent('brain space');
    expect(strong).toHaveClass('text-ink');
  });
});
